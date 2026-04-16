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

    def _send(self, to_email: str, subject: str, html_content: str) -> bool:
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f'{self.from_name} <{self.from_address}>'
            msg['To'] = to_email
            msg.attach(MIMEText(html_content, 'html'))
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(self.username, self.password)
                server.sendmail(self.from_address, to_email, msg.as_string())
            logger.info(f"Email sent to {to_email}: {subject}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

    async def send_password_reset_email(self, to_email: str, full_name: str, new_password: str) -> bool:
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
        return self._send(to_email, 'ShelterLink - Password Reset', html_content)

    async def send_new_booking_request_email(self, to_email: str, provider_name: str, seeker_name: str, listing_title: str, check_in: str, check_out: str) -> bool:
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #e51636; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0;">ShelterLink</h1>
            </div>
            <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                <h2 style="color: #111827;">New Booking Request</h2>
                <p style="color: #4b5563;">Hello {provider_name},</p>
                <p style="color: #4b5563;">You have received a new booking request for your listing.</p>
                <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; color: #9ca3af; font-size: 13px;">LISTING</td><td style="padding: 8px 0; color: #111827; font-weight: 600;">{listing_title}</td></tr>
                        <tr><td style="padding: 8px 0; color: #9ca3af; font-size: 13px;">SEEKER</td><td style="padding: 8px 0; color: #111827; font-weight: 600;">{seeker_name}</td></tr>
                        <tr><td style="padding: 8px 0; color: #9ca3af; font-size: 13px;">CHECK-IN</td><td style="padding: 8px 0; color: #111827;">{check_in}</td></tr>
                        <tr><td style="padding: 8px 0; color: #9ca3af; font-size: 13px;">CHECK-OUT</td><td style="padding: 8px 0; color: #111827;">{check_out}</td></tr>
                    </table>
                </div>
                <p style="color: #4b5563;">Please login to your dashboard to accept or reject this request.</p>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">This is an automated message from ShelterLink.</p>
            </div>
        </body>
        </html>
        """
        return self._send(to_email, f'ShelterLink - New Booking Request for {listing_title}', html_content)

    async def send_booking_accepted_email(self, to_email: str, seeker_name: str, listing_title: str, provider_name: str, check_in: str, check_out: str) -> bool:
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #e51636; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0;">ShelterLink</h1>
            </div>
            <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                <h2 style="color: #111827;">Booking Accepted!</h2>
                <p style="color: #4b5563;">Hello {seeker_name},</p>
                <p style="color: #4b5563;">Great news! Your booking request has been <strong style="color: #16a34a;">accepted</strong>.</p>
                <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; color: #9ca3af; font-size: 13px;">LISTING</td><td style="padding: 8px 0; color: #111827; font-weight: 600;">{listing_title}</td></tr>
                        <tr><td style="padding: 8px 0; color: #9ca3af; font-size: 13px;">HOST</td><td style="padding: 8px 0; color: #111827; font-weight: 600;">{provider_name}</td></tr>
                        <tr><td style="padding: 8px 0; color: #9ca3af; font-size: 13px;">CHECK-IN</td><td style="padding: 8px 0; color: #111827;">{check_in}</td></tr>
                        <tr><td style="padding: 8px 0; color: #9ca3af; font-size: 13px;">CHECK-OUT</td><td style="padding: 8px 0; color: #111827;">{check_out}</td></tr>
                    </table>
                </div>
                <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <p style="color: #166534; margin: 0;">Your stay is confirmed. Please check your dashboard for more details.</p>
                </div>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">This is an automated message from ShelterLink.</p>
            </div>
        </body>
        </html>
        """
        return self._send(to_email, f'ShelterLink - Booking Accepted for {listing_title}', html_content)

    async def send_booking_rejected_email(self, to_email: str, seeker_name: str, listing_title: str, provider_name: str, check_in: str, check_out: str, reason: str) -> bool:
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #e51636; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0;">ShelterLink</h1>
            </div>
            <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                <h2 style="color: #111827;">Booking Declined</h2>
                <p style="color: #4b5563;">Hello {seeker_name},</p>
                <p style="color: #4b5563;">Unfortunately, your booking request has been <strong style="color: #dc2626;">declined</strong>.</p>
                <div style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; color: #9ca3af; font-size: 13px;">LISTING</td><td style="padding: 8px 0; color: #111827; font-weight: 600;">{listing_title}</td></tr>
                        <tr><td style="padding: 8px 0; color: #9ca3af; font-size: 13px;">HOST</td><td style="padding: 8px 0; color: #111827; font-weight: 600;">{provider_name}</td></tr>
                        <tr><td style="padding: 8px 0; color: #9ca3af; font-size: 13px;">CHECK-IN</td><td style="padding: 8px 0; color: #111827;">{check_in}</td></tr>
                        <tr><td style="padding: 8px 0; color: #9ca3af; font-size: 13px;">CHECK-OUT</td><td style="padding: 8px 0; color: #111827;">{check_out}</td></tr>
                    </table>
                </div>
                <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <p style="color: #991b1b; margin: 0 0 5px 0; font-weight: 600;">Reason:</p>
                    <p style="color: #991b1b; margin: 0;">{reason}</p>
                </div>
                <p style="color: #4b5563;">Don't worry — you can browse other available shelters and try again.</p>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">This is an automated message from ShelterLink.</p>
            </div>
        </body>
        </html>
        """
        return self._send(to_email, f'ShelterLink - Booking Declined for {listing_title}', html_content)
