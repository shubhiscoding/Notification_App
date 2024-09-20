# Notification App
Running The Bot:

create a .env file with the following details:
```
MY_TOKEN=TELEGRAM_BOT_TOKEN
MY_CHAT_ID=SERVER_CHAT_ID
MY_TASK_CREATED_SQS=PAID_TASK_SQS_PATH_URL
MY_TASK_PAID_SQS=PAID_EVENT_SQS_PATH_URL
TASK_CREATED_VIDEO_URL=Video_Url
TASK_PAID_VIDEO_URL=Video_Url
TASK_BASE_URL=BASE_URL

EMAIL_SERVICE_SQS=EMAIL_SERVICE_SQS_PATH_URL
SENDER_EMAIL=exampel@gmail.com

AWS_ACCESS_KEY_ID=ACCESS_KEY
AWS_SECRET_ACCESS_KEY=SECRET_KEY
AWS_REGION=REGION
AWS_ENDPOINT=ENDPOINT

WEBSITE_URL=https://v2.gib.work/tasks/
```
Build The docker Image
```
docker build -t notification-app:latest .
```

Run the docker Image:
```
docker compose up
```


### Expected SQS Message formats Telegram Bot:
- [Task Created](https://github.com/shubhiscoding/Notification_App/blob/main/TgTestPayloads/task.json)
- [Task Paid](https://github.com/shubhiscoding/Notification_App/blob/main/TgTestPayloads/taskPaid.json)

### Expected SQS Message formats Email:
- [Service Request Created](https://github.com/shubhiscoding/Notification_App/blob/main/EmailTestPayloads/RequestCreated.json)
- [Service Request Approved](https://github.com/shubhiscoding/Notification_App/blob/main/EmailTestPayloads/RequestApproved.json)
- [Service Request Completed](https://github.com/shubhiscoding/Notification_App/blob/main/EmailTestPayloads/ServiceCompleted.json)


## Email Templates

In the server.js you can find the actual implementation of this at this [switch case](https://github.com/shubhiscoding/Notification_App/blob/9ed34f11d88042f766e7cecb2eccea71fd451fb5/Emailserver.js#L123)

### 1. New Service Request
- **Subject**: "New Service Request Posted"
- **Template**: [`new-service-request`](https://github.com/shubhiscoding/Notification_App/blob/main/templates/new-service-request.hbs)
- **Data Object**:
    ```json
    {
        "username": "string",
        "viewServiceLink": "string"
    }
    ```

### 2. Service Request Approved
- **Subject**: "Your Service Request Has Been Approved!"
- **Template**: [`service-request-approved`](https://github.com/shubhiscoding/Notification_App/blob/main/templates/service-request-approved.hbs)
- **Data Object**:
    ```json
    {
        "username": "string",
        "serviceTitle": "string",
        "viewServiceLink": "string"
    }
    ```

### 3. Service Request Completed
- **Subject**: "Service Request Completed - Time to Withdraw Your Earnings!"
- **Template**: [`service-request-completed`](https://github.com/shubhiscoding/Notification_App/blob/main/templates/service-request-completed.hbs)
- **Data Object**:
    ```json
    {
        "username": "string", 
        "serviceTitle": "string",
        "viewServiceLink": "string"
    }
    ```