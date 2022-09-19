variable "services_list" {
  type          = list(string)
  description   = "List of GCP APIs to enable"
  default       = ["iam.googleapis.com", "cloudresourcemanager.googleapis.com", "compute.googleapis.com" ]
}

variable "prefix" {
    description = "Prefix for all the resources to create. Normaly the project common name"
}

variable "project" {
    description = "ID of the GCP project"  
}

variable "region" {
    description = "Network region"
}

variable "zone" {
    description = "Network availability zone"
}

variable "ssh_port" {
    description = "Default SSH port to override"
}

variable "credentials_file_path" {
  description   = "Path to the JSON file that contains the service account credentials"
  default       = "./credentials.json"
}
