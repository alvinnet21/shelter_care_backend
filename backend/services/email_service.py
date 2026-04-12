import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Email service for sending emails via Gmail SMTP"""

    def __init__(self):
        self.username = os.environ.get('MAIL_USERNAME')
        self.password = os.environ.get('MAIL_PASSWORD')
        self.from_address = os.environ.get('MAIL_FROM_ADDRESS')
        self.from_name = os.environ.get('MAIL_FROM_NAME', 'ShelterLink')

    async def send_password_reset_email(self, to_email: str, full_name: str, new_password: str) -> bool:
        """Send password reset email with new random password"""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = 'ShelterLink - Password Reset'
            msg['From'] = f'{self.from_name} <{self.from_address}>'
            msg['To'] = to_email

            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #e51636; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: white; margin: 0;">ShelterLink</h1>
                </div>
                <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                    <h2 style="color: #111827;">Password Reset</h2>
                    <p style="color: #4b5563;">Hello {full_name},</p>
                    <p style="color: #4b5563;">Your password has been reset. Here is your new temporary password:</p>
                    <div style="background-color: #fff; border: 2px solid #e51636; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0;">
                        <p style="font-size: 24px; font-weight: bold; color: #e51636; letter-spacing: 2px; margin: 0;">{new_password}</p>
                    </div>
                    <p style="color: #4b5563;">Please login with this password and change it immediately from your Settings page.</p>
                    <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">If you did not request this password reset, please contact our support team immediately.</p>
                </div>
            </body>
            </html>
            """

            msg.attach(MIMEText(html_content, 'html'))

            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(self.username, self.password)
                server.sendmail(self.from_address, to_email, msg.as_string())

            logger.info(f"Password reset email sent to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
