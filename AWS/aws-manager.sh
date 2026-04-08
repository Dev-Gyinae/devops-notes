#!/bin/bash

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================="
echo "AWS MANAGER SCRIPT"
echo "========================================="
echo "Account: $(aws sts get-caller-identity --query Account --output text)"
echo "User: $(aws sts get-caller-identity --query Arn --output text | cut -d'/' -f2)"
echo "========================================="
echo ""

# Main menu function
show_menu() {
    echo "What would you like to do?"
    echo ""
    echo "IDENTITY & SECURITY"
    echo "  1) Who am I?"
    echo "  2) List all IAM users"
    echo "  3) List my permissions"
    echo "  4) List my groups"
    echo ""
    echo "BILLING & COST"
    echo "  5) Check current month's cost"
    echo "  6) Check yesterday's cost"
    echo "  7) Check cost for custom date range"
    echo ""
    echo "EC2 INSTANCES"
    echo "  8) List all EC2 instances"
    echo "  9) List running EC2 instances only"
    echo " 10) Stop an EC2 instance"
    echo " 11) Start an EC2 instance"
    echo " 12) Terminate an EC2 instance (DANGER!)"
    echo ""
    echo "S3 STORAGE"
    echo " 13) List all S3 buckets"
    echo " 14) List contents of a bucket"
    echo " 15) Create a new bucket"
    echo " 16) Upload a file to a bucket"
    echo " 17) Delete a bucket (DANGER!)"
    echo ""
    echo "DYNAMODB"
    echo " 18) List all DynamoDB tables"
    echo " 19) Describe a DynamoDB table"
    echo ""
    echo "UTILITIES"
    echo " 20) List all AWS regions"
    echo " 21) Check service health"
    echo " 22) Run safety check (running resources)"
    echo " 23) Exit"
    echo ""
    echo -n "Enter your choice (1-23): "
}

# Function to check if command was successful
check_error() {
    if [ $? -ne 0 ]; then
        echo -e "${RED}Command failed!${NC}"
        return 1
    fi
    return 0
}

# Main loop
while true; do
    show_menu
    read choice
    
    case $choice in
        1)
            echo -e "\n${GREEN}Current User Identity:${NC}"
            aws sts get-caller-identity
            ;;
        2)
            echo -e "\n${GREEN}All IAM Users:${NC}"
            aws iam list-users --query 'Users[*].[UserName,CreateDate]' --output table
            ;;
        3)
            echo -e "\n${GREEN}My Permissions (Attached Policies):${NC}"
            aws iam list-attached-user-policies --user-name bootcamp --query 'AttachedPolicies[*].PolicyName' --output table 2>/dev/null || echo "Try: aws iam list-attached-user-policies --user-name YOUR_USERNAME"
            ;;
        4)
            echo -e "\n${GREEN}My Groups:${NC}"
            aws iam list-groups-for-user --user-name bootcamp --query 'Groups[*].GroupName' --output table 2>/dev/null || echo "Try: aws iam list-groups-for-user --user-name YOUR_USERNAME"
            ;;
        5)
            echo -e "\n${GREEN}Current Month's Cost:${NC}"
            aws ce get-cost-and-usage --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) --granularity MONTHLY --metrics "UnblendedCost" --query 'ResultsByTime[0].Total.UnblendedCost' --output table 2>/dev/null || echo "Cost Explorer might not be enabled"
            ;;
        6)
            echo -e "\n${GREEN}Yesterday's Cost:${NC}"
            aws ce get-cost-and-usage --time-period Start=$(date -d "yesterday" +%Y-%m-%d),End=$(date +%Y-%m-%d) --granularity DAILY --metrics "UnblendedCost" --query 'ResultsByTime[0].Total.UnblendedCost' --output table 2>/dev/null || echo "Cost Explorer might not be enabled"
            ;;
        7)
            echo -n "Enter start date (YYYY-MM-DD): "
            read start_date
            echo -n "Enter end date (YYYY-MM-DD): "
            read end_date
            echo -e "\n${GREEN}Cost from $start_date to $end_date:${NC}"
            aws ce get-cost-and-usage --time-period Start=$start_date,End=$end_date --granularity DAILY --metrics "UnblendedCost" --output table 2>/dev/null || echo "Cost Explorer might not be enabled"
            ;;
        8)
            echo -e "\n${GREEN}All EC2 Instances:${NC}"
            aws ec2 describe-instances --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,State.Name,Tags[?Key==`Name`].Value|[0]]' --output table
            ;;
        9)
            echo -e "\n${GREEN}Running EC2 Instances:${NC}"
            aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,Tags[?Key==`Name`].Value|[0]]' --output table
            ;;
        10)
            echo -e "\n${YELLOW}Listing running instances:${NC}"
            aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" --query 'Reservations[*].Instances[*].[InstanceId,Tags[?Key==`Name`].Value|[0]]' --output table
            echo -n "Enter Instance ID to STOP: "
            read instance_id
            echo -e "${YELLOW}Stopping instance $instance_id...${NC}"
            aws ec2 stop-instances --instance-ids $instance_id
            check_error
            ;;
        11)
            echo -e "\n${YELLOW}Listing stopped instances:${NC}"
            aws ec2 describe-instances --filters "Name=instance-state-name,Values=stopped" --query 'Reservations[*].Instances[*].[InstanceId,Tags[?Key==`Name`].Value|[0]]' --output table
            echo -n "Enter Instance ID to START: "
            read instance_id
            echo -e "${GREEN}Starting instance $instance_id...${NC}"
            aws ec2 start-instances --instance-ids $instance_id
            check_error
            ;;
        12)
            echo -e "\n${RED}DANGER: This will permanently delete EC2 instances!${NC}"
            aws ec2 describe-instances --query 'Reservations[*].Instances[*].[InstanceId,State.Name,Tags[?Key==`Name`].Value|[0]]' --output table
            echo -n "Enter Instance ID to TERMINATE (or 'cancel' to abort): "
            read instance_id
            if [ "$instance_id" != "cancel" ]; then
                echo -n "Type 'DELETE' to confirm termination: "
                read confirm
                if [ "$confirm" = "DELETE" ]; then
                    aws ec2 terminate-instances --instance-ids $instance_id
                    echo -e "${RED}Instance terminated!${NC}"
                else
                    echo "Cancelled."
                fi
            fi
            ;;
        13)
            echo -e "\n${GREEN}All S3 Buckets:${NC}"
            aws s3 ls
            ;;
        14)
            echo -n "Enter bucket name: "
            read bucket_name
            echo -e "\n${GREEN}Contents of $bucket_name:${NC}"
            aws s3 ls s3://$bucket_name/
            ;;
        15)
            echo -n "Enter new bucket name (unique, lowercase, no spaces): "
            read bucket_name
            echo -n "Enter region (e.g., us-east-1): "
            read region
            echo -e "${GREEN}Creating bucket...${NC}"
            aws s3 mb s3://$bucket_name --region $region
            check_error
            ;;
        16)
            echo -n "Enter bucket name: "
            read bucket_name
            echo -n "Enter local file path to upload: "
            read file_path
            if [ -f "$file_path" ]; then
                aws s3 cp "$file_path" s3://$bucket_name/
                echo -e "${GREEN}File uploaded!${NC}"
            else
                echo -e "${RED}File not found!${NC}"
            fi
            ;;
        17)
            echo -e "\n${RED}DANGER: This will delete the bucket and ALL contents!${NC}"
            aws s3 ls
            echo -n "Enter bucket name to DELETE: "
            read bucket_name
            echo -n "Type 'DELETE BUCKET' to confirm: "
            read confirm
            if [ "$confirm" = "DELETE BUCKET" ]; then
                aws s3 rb s3://$bucket_name --force
                echo -e "${RED}Bucket deleted!${NC}"
            else
                echo "Cancelled."
            fi
            ;;
        18)
            echo -e "\n${GREEN}DynamoDB Tables:${NC}"
            aws dynamodb list-tables --output table
            ;;
        19)
            echo -n "Enter DynamoDB table name: "
            read table_name
            echo -e "\n${GREEN}Table Details:${NC}"
            aws dynamodb describe-table --table-name $table_name --query 'Table.[TableName,TableStatus,ItemCount,TableSizeBytes]' --output table
            ;;
        20)
            echo -e "\n${GREEN}All AWS Regions:${NC}"
            aws ec2 describe-regions --query 'Regions[*].RegionName' --output table
            ;;
        21)
            echo -e "\n${GREEN}AWS Service Health (us-east-1):${NC}"
            echo "Check https://status.aws.amazon.com/ for detailed health"
            echo "Or run: aws health describe-events --region us-east-1"
            ;;
        22)
            echo -e "\n${YELLOW}SAFETY CHECK - Running Resources${NC}"
            echo "========================================="
            echo "Running EC2 Instances:"
            aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" --query 'Reservations[*].Instances[*].[InstanceId,InstanceType]' --output table 2>/dev/null || echo "None or no access"
            echo ""
            echo "S3 Buckets:"
            aws s3 ls 2>/dev/null || echo "None or no access"
            echo ""
            echo "DynamoDB Tables:"
            aws dynamodb list-tables --output table 2>/dev/null || echo "None or no access"
            echo ""
            echo "Elastic IPs:"
            aws ec2 describe-addresses --query 'Addresses[*].PublicIp' --output table 2>/dev/null || echo "None or no access"
            echo ""
            echo -e "${GREEN}Safety check complete!${NC}"
            ;;
        23)
            echo -e "\n${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "\n${RED}Invalid choice! Please enter 1-23${NC}"
            ;;
    esac
    
    echo ""
    echo -n "Press Enter to continue..."
    read
    clear
    
done
