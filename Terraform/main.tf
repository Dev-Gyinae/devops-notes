#AWS CONFIGURE LIST - use this to check for your set credentials

provider "aws" {
	region = "eg. eu-west-3 "
	access_key = ""
	secret_key = "" 
}

resource "aws_vpc" "name_of_VPC" {
	cidr_block = "eg. 10.0.0.0/16"
}

resource "aws_subnet" "name_of_subnet" {
	vpc_id = aws_vpc.name_of_VPC.id
	cidr_block = "eg. 10.0.10.0/24"
	availability_zone = "eg. eu-west-3a"
}


# Creating resources into a default vpc

data "aws_vpc" "eg. existing_vpc" {
	default = true
}

resource "aws_subnet" "name_of_subnet_2" {
        vpc_id = data.aws_vpc.existing_vpc.id
        cidr_block = "eg. refer default id"
        availability_zone = "eg. eu-west-3a"
}


