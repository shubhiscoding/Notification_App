const {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require("@aws-sdk/client-sqs");
const aws = require("aws-sdk");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");

dotenv.config();

// Update AWS credentials and region for aws-sdk
aws.config.update({
  endpoint: process.env.AWS_ENDPOINT_SES,
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Initialize SES using aws-sdk
const ses = new aws.SES();

const sqsClient = new SQSClient({
  endpoint: process.env.AWS_ENDPOINT_SQS,
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const email_queue = process.env.EMAIL_SERVICE_SQS;

// Function to verify the email address before sending the email
async function verifyEmail(email) {
  try {
    const params = {
      EmailAddress: email,
    };
    const response = await ses.verifyEmailAddress(params).promise();
    console.log("Email verification initiated:", response);
  } catch (error) {
    console.error("Error verifying email:", error);
  }
}

// Function to load and compile Handlebars template
function loadTemplate(templateName) {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
  return Handlebars.compile(templateContent);
}

// Function to send the email using aws-sdk SES
async function sendEmail(emailData) {
  const template = loadTemplate(emailData.templateName);
  const htmlContent = template(emailData.templateData);

  const input = {
        "Destination": {
            "ToAddresses": emailData.To,
    },
        "Message": {
            "Body": {
                "Html": {
                    "Data": htmlContent,
                }
      },
            "Subject": {
                "Data": emailData.subject,
            }
    },
        "Source": process.env.SENDER_EMAIL,
  };

  try {
    const response = await ses.sendEmail(input).promise();
    console.log("Email sent successfully:", response.MessageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

async function receiveAndProcessSQSMessage(queue_url) {
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

      // First verify the email address
      await verifyEmail(process.env.SENDER_EMAIL);

      const emailData = parseMessage(response);
      // Then send the email
      await sendEmail(emailData);

      // Delete the message from SQS after processing
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

function parseMessage(response) {
  let subject, templateName, templateData;
  const To = response.emails;

  switch (response.type) {
    case "new-service-request":
      subject = "New Service Request Posted";
      templateName = "new-service-request";
      templateData = {
        username: response.data.username,
        serviceTitle: response.data.serviceTitle,
        viewServiceLink: `${process.env.WEBSITE_URL}/services/${response.data.serviceId}`
      };
      break;
    case "service-request-approved":
      subject = "Your Service Request Has Been Approved!";
      templateName = "service-request-approved";
      templateData = {
        username: response.data.username,
        serviceTitle: response.data.serviceTitle,
        viewServiceLink: `${process.env.WEBSITE_URL}/services/${response.data.serviceId}`
      };
      break;
    case "service-request-completed":
      subject = "Service Request Completed - Time to Withdraw Your Earnings!";
      templateName = "service-request-completed";
      templateData = {
        username: response.data.username,
        serviceTitle: response.data.serviceTitle,
        viewServiceLink: `${process.env.WEBSITE_URL}/services/${response.data.serviceId}`
      };
      break;
    case "service-request-rejected":
      subject = "Service Request Rejected";
      templateName = "service-request-rejected";
      templateData = {
        username: response.data.username,
        serviceTitle: response.data.serviceTitle,
        viewServiceLink: `${process.env.WEBSITE_URL}/services/${response.data.serviceId}`
      };
      break;
    case "new-comment-on-service":
      subject = "New Comment on Your Service";
      templateName = "new-comment-on-service";
      templateData = {
        username: response.data.username,
        serviceTitle: response.data.serviceTitle,
        viewServiceLink: `${process.env.WEBSITE_URL}/services/${response.data.serviceId}`
      };
      break;
    default:
      throw new Error("Unknown message type");
  }

  console.log("---------------Email parsed-------------");
  console.log("Subject:", subject);
  console.log("To:", To);
  console.log("Template Name:", templateName);
  console.log("Template Data:", templateData);
  console.log("-----------------------------------------");

  return { subject, To, templateName, templateData };
}

function pollMessages() {
  setInterval(() => {
    receiveAndProcessSQSMessage(email_queue);
  }, 5000);
}

pollMessages();
