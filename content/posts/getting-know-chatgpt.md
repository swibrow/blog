+++
author = "Samuel Wibrow"
title = "Getting to know ChatGPT"
date = "2023-04-12"
description = "A brief interaction with OpenAi's chatGPT"
tags = [
    "chatgpt",
    "privacy",
]
draft = true
+++

Hello everyone! Today, I want to share my intriguing journey of adapting a pre-made Python tutorial on building a URL shortener to use DynamoDB for its backend, and how I successfully crafted a unique, user-friendly frontend with the help of ChatGPT.

As someone who has always been captivated by the simplicity and usefulness of URL shorteners, I wanted to create my own but with a personal touch. I knew that in order to achieve a functional, secure, and scalable URL shortener, I would need a strong backend, an engaging frontend, and an efficient infrastructure.

I started by finding a Python tutorial that provided a great starting point for building a URL shortener. However, I wanted to go beyond the tutorial's original design and utilize DynamoDB as my database, as it would scale well and deliver outstanding performance. With that in mind, I redesigned the backend to work seamlessly with DynamoDB, creating a simple schema for my table and implementing CRUD operations to interact with the database.

Once the backend was ready, it was time to work on the frontend. To make it truly unique and user-friendly, I turned to ChatGPT for guidance. With ChatGPT's assistance, I created a visually appealing and functional UI using Angular. The frontend allowed users to easily shorten URLs, manage their existing links, and view analytics. ChatGPT even helped me add features like dark mode, a QR code generator, and clipboard functionality for a more streamlined user experience.

To deploy my application, I opted for AWS Lambda, which provided a cost-effective and highly scalable solution. I used Terraform to automate the deployment process, creating a module that deployed both the DynamoDB table and the Lambda function. I also set up API Gateway to handle incoming requests and created an S3 bucket to host my frontend.

Throughout the development process, I encountered a few challenges, such as CORS-related issues and permission errors. Thankfully, ChatGPT was there to help me troubleshoot and overcome these obstacles, ensuring a smooth development experience.

I wanted to make my URL shortener even more accessible and professional, so I decided to add custom domain support. With ChatGPT's guidance, I used Route 53 to configure the custom domain and created a CloudFront distribution to serve my frontend through a Content Delivery Network (CDN), ensuring fast load times for users around the world.

Looking back, I am thrilled with the end product—a robust, secure, and scalable URL shortener that not only meets but exceeds my initial expectations. Throughout this journey, I learned a great deal about web development, infrastructure, and problem-solving, and I am excited to share my unique creation with the world.

Thank you for joining me on this adventure, and I hope my story inspires you to embark on your own web development journey and make use of amazing tools like ChatGPT!