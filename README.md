# earthquake-hazard-probabilistic-ws
Seismic hazard curve web service

==============
[![Build Status](https://travis-ci.org/usgs/earthquake-hazard-probabilistic-ws.svg?branch=master)](https://travis-ci.org/usgs/earthquake-hazard-probabilistic-ws)

Using the Generated Project
---------------------------

## Getting Started
- run `npm install` to install application development dependencies
    - The application will prompt you for configuration information,
      and create a file named `src/conf/config.json` in the project.
- run `npm run dev` from the install directory


## Docker

### Building an image

- From root of project, run:
    ```
    docker build -t usgs/earthquake-hazard-probabilistic-ws:latest .
    ```

### Running a container

- Start the container using the image tag
    ```
    docker run --name earthquake-hazard-probabilistic-ws -d -p 8000:8000
    usgs/earthquake-hazard-probabilistic-ws:latest
    ```

- Configure started container

    - Connect to running container on terminal
    ```
    docker exec -it earthquake-hazard-probabilistic-ws /bin/bash
    ```

    - Run pre-install to configure application
    ```
    src/lib/pre-install
    ```

    - Exit the container
    ```
    exit
    ```

- Restart the container to load the updated configuration
  ```
  docker stop earthquake-hazard-probabilistic-ws
  docker start earthquake-hazard-probabilistic-ws
  ```

- Connect to running container in browser
  ```
  http://localhost:8000/ws/earthquake-hazard-probabilistic-ws/
  ```
