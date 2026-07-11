# 🛡️ SecureWipe Enterprise

## 📝 About the Project
SecureWipe Enterprise is a professional enterprise web application designed for secure data sanitization, storage device management, verification, certificate generation, and enterprise reporting.

## 🛠️ Technologies Used
- React
- Node.js
- Express.js
- PostgreSQL
- JWT Authentication
- PDFKit
- Vite

## ⚠️ Problem Statement
Standard operating system file deletion commands (such as emptying the Recycle Bin or quick formatting) only remove file pointers and index tables, leaving the actual data blocks intact on the storage medium. This allows standard data recovery tools to easily retrieve confidential or proprietary files. SecureWipe Enterprise addresses this vulnerability by overwriting raw sectors with specialized data patterns, rendering recovery forensically impossible.

## ✨ Key Features
- **Secure Authentication**: Session verification using securely signed JSON Web Tokens (JWT) to authorize console operations.
- **Device Detection**: Automated hardware scanning of connected storage nodes and drive partitions.
- **Device Analysis**: Forensic profiling of volume storage blocks, detecting folder contents and sensitive file risk indices.
- **Full Wipe**: Complete volume sanitization overwriting all data sectors on selected drives.
- **Selective Wipe**: Directory-level secure file destruction targeting specific folder trees or files.
- **SSD Protection**: Safety write-blocks on Solid State Drives (SSD) to protect physical wear limits while offering read-only file audits.
- **Operating System Protection**: Hardcoded logical blocks preventing operators from accidentally targeting active boot partitions or system drives.
- **Verification**: Post-wipe verification passes checking disk sectors for residual data.
- **Certificate Generation**: Generation of cryptographically signed compliance certificates containing detailed destructions summaries and verification logs.
- **Activity Logs**: Secure audit ledger recording every operator event (login, disk discovery, sanitization runs).
- **Enterprise Reports**: Administrator dashboard statistics showing consolidated overview analytics.
- **PDF Report Export**: Exporter generating PDF documentation of Executive Summaries and Device inventories.
- **Role-Based Access Control**: Granular clearance filters separating standard Operators from compliance Admins.

## 🔄 Workflow
The typical user workflow follows these sequential stages:
**Login** ➔ **Detect Device** ➔ **Analyze** ➔ **Wipe** ➔ **Verify** ➔ **Certificate** ➔ **Reports**

## 🚀 Deployment
SecureWipe Enterprise is designed for cloud deployment and production environments. The application supports deployment using modern cloud hosting platforms together with a managed PostgreSQL database, providing secure, scalable, and reliable web access.

## 📌 Current Version
SecureWipe Enterprise v1.0

## 👤 Author
- **Name**: Jothshana Karuppanasamy
- **LinkedIn**: [Jothshana Karuppanasamy](https://www.linkedin.com/in/jothshana-karuppanasamy/)

## ⭐ Support
If you find this project useful, please star the repository!
