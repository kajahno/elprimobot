# Elprimobot infrastructure 

Has all required resources in the cloud to run the project

## Requirements
* Need to configure a GCP bucket to be used as terraform backend
* Configure backend as per in the sample file

## Setup

* Download and install [terraform 1.2](https://www.terraform.io/downloads)
* Create the file credentials.json with the service account credentials

## Commands

* Initialize project: `$ terraform init`
* Dry-run project: `$ terraform plan`
* Apply change: `$ terraform apply `
