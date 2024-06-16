terraform {
  required_version = ">= 1.6.0"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }

  backend "s3" {
    bucket = "state.wibrow.net"
    key    = "blog/terraform.tfstate"
    region = "eu-central-1"
  }
}

provider "github" {
  owner = "swibrow"
}



resource "github_repository" "blog" {
  name        = "blog"
  description = "My Personal Blog"

  visibility = "public"

  has_discussions = true

  delete_branch_on_merge = true

  has_downloads = true
  homepage_url = "https://samuel.wibrow.net/"

  vulnerability_alerts = true

  pages {
    build_type = "workflow"
    cname     = "samuel.wibrow.net"
    source {
      branch = "gh-pages"
      path   = "/"
    }
  }
}

import {
  to = github_repository.blog
  id = "blog"
}