import nodemailer from 'nodemailer';
import Config from '../config/config.js';

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: Config.emailUser,
        pass: Config.emailPass
      }
    });

    await transporter.sendMail({
      from: Config.emailUser,
      to,
      subject,
      html: htmlContent
    });
    
    console.log('send email success');
  } catch (error) {
    throw error;
  }
};

export default sendEmail;