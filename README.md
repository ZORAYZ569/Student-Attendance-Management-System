# Student Attendance Management System Using DevOps Tools

## Features
- Add and delete student records; duplicate roll numbers are rejected.
- Mark seven periods as Present (P) or Absent (A) for a selected date.
- Save/revise date-wise attendance records.
- Calculate monthly attended, absent, working periods and attendance percentage.
- Flag students below a 75% threshold and export a CSV report.
- Health endpoint at `/api/health`.

## Requirements
- Node.js 18 or newer and npm.
- Optional: Docker; Jenkins; Kubernetes; Chrome for the optional Selenium smoke test.

## Run locally
```bash
npm install
npm start
```
Open http://localhost:3000. Data is stored in `data/store.json` and persists across normal application restarts. Back up this file before deleting/replacing it.

## Basic tests
```bash
npm test
```
The included Node tests check the percentage formula and seven-period structure. They are logic tests, not a full end-to-end suite.

## Optional Selenium smoke test
Install dependencies with `npm install`, ensure Chrome is installed, start the application in one terminal, then run:
```bash
node tests/selenium-smoke.js
```

## Docker
```bash
docker build -t student-attendance:latest .
docker run --rm -p 3000:3000 -v "$(pwd)/data:/app/data" student-attendance:latest
```

## Kubernetes
Build the image in the same Docker environment used by your local Kubernetes cluster, then:
```bash
kubectl apply -f k8s/deployment.yaml
kubectl get deployments,pods,services
```
For a remote cluster, push the image to a registry and update `image` in `k8s/deployment.yaml`.

## Jenkins
Create a Jenkins Pipeline job linked to this repository. The included `Jenkinsfile` runs `npm install`, `npm test`, and `docker build`. The Jenkins agent must have Node/npm and Docker access configured. This pipeline has not run automatically until you configure a Jenkins job.

## Data and scope notes
This rapid prototype uses a JSON file as its persistent data store so it can run with minimal setup. The supplied project specification lists SQLite or MySQL; if your evaluation requires a relational database, migrate the store layer before claiming that requirement is implemented. Authentication, role-based access, production-grade concurrent writes, and database backups are outside this prototype's scope. Monthly totals count only attendance statuses actually saved; unmarked periods are not assumed to be working periods.

## Submission checklist
- Run locally and verify add student, mark attendance, save, monthly report and CSV export.
- Run `npm test`.
- Capture screenshots from the running app.
- Only describe Docker/Jenkins/Kubernetes/Selenium as executed if you actually run and verify them.
