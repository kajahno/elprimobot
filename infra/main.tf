####################################################
# Infrastructure that hosts this project resources #
####################################################

locals {
  zone    = "${var.region}-${var.zone}"
  init_script = "cd /etc/ssh && sed -i s'/#Port 22/Port ${var.ssh_port}/' sshd_config && service sshd restart && apt update"
}

provider "google" {
  credentials  = file(var.credentials_file_path)
  project = var.project
  region  = var.region
  zone    = local.zone
}

# Enabling this the first time might cause terraform to fail with an error stating 
  # we need to wait and apply the changes again
resource "google_project_service" "main" {
  count = length(var.services_list)
  project = var.project
  service = var.services_list[count.index]
}

resource "google_compute_network" "main" {
  name                    = "${var.prefix}-net"
  auto_create_subnetworks = "false"
  depends_on = [
    google_project_service.main
  ]
}

resource "google_compute_firewall" "main" {
  name    = "${var.prefix}-fw"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = [var.ssh_port]
  }

  source_ranges = ["0.0.0.0/0"]
}

resource "google_compute_subnetwork" "main" {
  name          = "${var.prefix}-subnet"
  ip_cidr_range = "10.1.0.0/24"
  region        = var.region
  network       = google_compute_network.main.id
}

resource "google_compute_instance" "main" {
  name         = "${var.prefix}-instance"
  machine_type = "e2-micro"

  boot_disk {
    auto_delete = true
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-minimal-2204-lts"
      size = "30"
      type = "pd-standard"
    }

  }
  
  metadata = {
    startup-script = local.init_script
    ssh-keys = "${var.instance_public_ssh_user}:${var.instance_public_ssh_key}"
  }
  
  network_interface {
    subnetwork = google_compute_subnetwork.main.self_link
    access_config {
    }
  }
}
