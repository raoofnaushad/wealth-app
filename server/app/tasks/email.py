import structlog

from app.config import settings
from app.tasks.celery_app import celery_app

logger = structlog.get_logger()


def _send_email(to: str, subject: str, html: str) -> None:
    if settings.EMAIL_DRY_RUN:
        logger.info("DRY RUN email", to=to, subject=subject, html_length=len(html))
        return

    import resend

    resend.api_key = settings.RESEND_API_KEY
    resend.Emails.send(
        {
            "from": settings.EMAIL_FROM,
            "to": to,
            "subject": subject,
            "html": html,
        }
    )


@celery_app.task(
    name="app.tasks.email.send_invitation_email",
    bind=True,
    max_retries=3,
    default_retry_delay=10,
)
def send_invitation_email(
    self,
    invitation_id: str,
    org_name: str,
    inviter_name: str,
    invitee_email: str,
    invitee_name: str,
    module_roles: list[dict],
):
    try:
        roles_text = ", ".join(
            f"{r['moduleSlug'].capitalize()}: {r['role'].capitalize()}" for r in module_roles
        )

        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You've been invited to join {org_name or 'the organization'}</h2>
            <p>Hi {invitee_name},</p>
            <p>{inviter_name} has invited you to join the team with the following roles:</p>
            <p><strong>{roles_text}</strong></p>
            <p>Click the link below to accept the invitation and set up your account:</p>
            <a href="https://app.invictus.ai/invite/{invitation_id}"
               style="display: inline-block; padding: 12px 24px; background: #1E3A5F; color: white; text-decoration: none; border-radius: 6px;">
                Accept Invitation
            </a>
            <p style="color: #666; font-size: 12px; margin-top: 24px;">
                This invitation expires in 7 days.
            </p>
        </div>
        """

        _send_email(
            to=invitee_email,
            subject=f"You're invited to join {org_name or 'Invictus'}",
            html=html,
        )

        logger.info("invitation_email_sent", invitation_id=invitation_id, to=invitee_email)

    except Exception as exc:
        logger.error("invitation_email_failed", invitation_id=invitation_id, error=str(exc))
        raise self.retry(exc=exc, countdown=10 * (2 ** self.request.retries))


@celery_app.task(name="app.tasks.email.send_password_reset_email", bind=True, max_retries=3)
def send_password_reset_email(self, user_id: str, email: str, reset_token: str):
    try:
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Reset your password</h2>
            <p>Click the link below to reset your password:</p>
            <a href="https://app.invictus.ai/reset-password?token={reset_token}"
               style="display: inline-block; padding: 12px 24px; background: #1E3A5F; color: white; text-decoration: none; border-radius: 6px;">
                Reset Password
            </a>
            <p style="color: #666; font-size: 12px; margin-top: 24px;">
                This link expires in 1 hour. If you didn't request this, you can ignore this email.
            </p>
        </div>
        """

        _send_email(to=email, subject="Reset your Invictus password", html=html)
        logger.info("password_reset_email_sent", user_id=user_id)

    except Exception as exc:
        logger.error("password_reset_email_failed", user_id=user_id, error=str(exc))
        raise self.retry(exc=exc, countdown=10 * (2 ** self.request.retries))
