#!/bin/bash

sudo git pull

sudo docker-compose down

sudo docker-compose up -d

sudo docker-compose logs -f -t
