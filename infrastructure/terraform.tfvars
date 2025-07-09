# AWS Configuration
aws_region = "ap-south-1"

# SSH Key Configuration
# Replace this with your actual SSH public key content
# You can get your public key by running: cat ~/.ssh/judge0.pub
ssh_public_key = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCvJdQEXPdILqJERjzktm4RIXnmWF7EcTDR9LcEVn5Jcijz+h8VwqPgaB+/WZ0Vk/3W9K0Ldxiav6vL3uNMWjajgGCkoe7jQY9ydPOK+ytYGVAb0kdIOfpNm+GTv270rO+qW5b1ucQ5txm6hF3nfGoX6iQ9GqRP1isSYfhcSS52TlQ42XeuExxkEEDM8Txn4xXnn/5Jxjn6PVJghXrzNx1T7vqWPtuulNWD5IpjiKFVNs1gHk3+OuSPvfIsTZrwDEaI6oKYtkwnfvLRV0QGb9sn8DuX+mxwzLrXJlGeJL7i6oum+757zR2Tugs6zpWCu6JIvF+8rHcgQq7Ocoypk07GpTdQBasWbTXtJu1eE97ldjsD+2epk59saS87bTaCKIA21Ize/JtdcbMsJeBPcXnZ9h7W57+RZTHb3pMK3bEemRj4yfvj8ArfI8Efe1KBad+aVxnyfQfZ400Y+nUqU3OVEmpnFKgHt7RDHTKI1dkaiIROlZdYM4knISq8evXa4xYb5HIt1GFl4/DGD1aw8NP7w3T9r3eOKpuBPMTjIc2v/dtx+Ed6dNYotsquImN3cONq8N9PR55lNz8yOFwvfD1rgs8wsMq24Q+wxQP76vIQS8d51O1LZMKRQQBX54TyQCY69T+GC6/T+blr/YMY0BF20uhJMaXE7H4ZPybCbLxVfw== parv@ghanshyam"

# Network Security Configuration
# Replace with your actual admin IP ranges for better security
# You can get your current IP with: curl ifconfig.me
# admin_ip_ranges = ["0.0.0.0/0"]  # WARNING: This allows access from anywhere. Replace with your actual IP ranges.
admin_ip_ranges = [
  "119.160.199.91/32",
  "66.33.22.3/32"
     # Replace with your actual IP
]

# Environment Configuration
environment = "dev"
project_name = "code-class" 