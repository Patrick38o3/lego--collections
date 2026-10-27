const nodemailer = require("nodemailer");

async function sendEmail() {
  const username = process.env.MAIL_USERNAME;
  const password = process.env.MAIL_PASSWORD;

  if (!username || !password) {
    throw new Error("MAIL_USERNAME and MAIL_PASSWORD must both be set.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: username,
      pass: password,
    },
  });

  await transporter.sendMail({
    from: username,
    to: username,
    subject: "乐高收藏日报-测试版",
    text: "这是一封测试邮件，收到说明自动化成功！",
  });

  console.log(`Test email sent to ${username}.`);
}

sendEmail().catch((error) => {
  console.error("Failed to send test email:", error);
  process.exitCode = 1;
});
