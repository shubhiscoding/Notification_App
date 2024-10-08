const axios = require('axios');
const {
    SQSClient,
    ReceiveMessageCommand,
    DeleteMessageCommand,
} = require("@aws-sdk/client-sqs");

const dotenv = require('dotenv');
dotenv.config();

const TELEGRAM_TOKEN = process.env.MY_TOKEN;
const TELEGRAM_CHAT_ID = process.env.MY_CHAT_ID;

const sendTelegramMessage = async (text, videoUrl, linkUrl = null) => {
    const apiUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendVideo`;

    // Prepare the payload
    const payload = {
        chat_id: TELEGRAM_CHAT_ID,
        video: videoUrl,
        caption: text,
    };

    // If a link is provided, add an inline keyboard with the button
    if (linkUrl) {
        payload.reply_markup = {
            inline_keyboard: [
                [
                    {
                        text: "🔗Go To Task", // Button text
                        url: linkUrl // URL to redirect to when clicked
                    }
                ]
            ]
        };
    }

    try {
        await axios.post(apiUrl, payload);
        console.log("Video with text and button sent to Telegram successfully!");

    } catch (error) {
        console.error("Error sending message to Telegram:", error);
    }
};


const Task_Created_Queue_url = process.env.MY_TASK_CREATED_SQS;
const Task_Paid_Queue_url = process.env.MY_TASK_PAID_SQS;
const sqsClient = new SQSClient({
    endpoint: process.env.AWS_ENDPOINT_SQS,
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

async function receiveAndProcessSQSMessage(queue_url, type) {
    try {
        const receiveMessageCommand = new ReceiveMessageCommand({
            QueueUrl: queue_url,
            MaxNumberOfMessages: 1,
        });

        const data = await sqsClient.send(receiveMessageCommand);

        if (data.Messages && data.Messages.length > 0) {
            const message = data.Messages[0];
            console.log("Received message:", message.Body);

            const response = JSON.parse(message.Body);

            let MessageToUser;
            let videoUrl;
            if(type === 'CreateTask'){
                MessageToUser = parseTask(response);
                videoUrl = process.env.TASK_CREATED_VIDEO_URL;
                await sendTelegramMessage(MessageToUser, videoUrl, process.env.TASK_BASE_URL + response.id);
            }else if(type === 'TaskPaid'){
                MessageToUser = parseTaskPaid(response);
                videoUrl = process.env.TASK_PAID_VIDEO_URL
                await sendTelegramMessage(MessageToUser, videoUrl, process.env.TASK_BASE_URL + response.task.id);
            }

            const deleteMessageCommand = new DeleteMessageCommand({
                QueueUrl: queue_url,
                ReceiptHandle: message.ReceiptHandle,
            });
            await sqsClient.send(deleteMessageCommand);
            console.log("Message deleted from SQS.");
        }
    } catch (error) {
        console.error("Error receiving or processing message from SQS:", error);
    }
}

// Create Message for Task Created
function parseTask(response){
    const amount = parseFloat(response.asset.amount);
    const decimals = response.asset.decimals || 0;
    let amnt = amount / (10 ** decimals);
    let roundedAmount = amnt.toFixed(2);
    return `🚨 New Task Alert: ${response['title']}! 🚨\n
💰 Reward: ${roundedAmount}${response.asset.symbol} (~$${response.asset.price.toFixed(2)})`;
}

// Create Message for Task Paid (Waiting for Task Paid Payload)
function parseTaskPaid(response){
    const amount = parseFloat(response.submission.asset.amount);
    const decimals = response.submission.asset.decimals || 0;
    let amnt = amount / (10 ** decimals);
    let roundedAmount = amnt.toFixed(2);
    
    return `🎉 ${response.submission.user.username} Just Got Paid! 🎉\n \n🎯 Task: ${response.task.title}`
}


function pollMessages() {
    setInterval(() => {
        receiveAndProcessSQSMessage(Task_Created_Queue_url, 'CreateTask');
        receiveAndProcessSQSMessage(Task_Paid_Queue_url, 'TaskPaid');
    }, 5000);
}
pollMessages();