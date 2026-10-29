
import "server-only";
import nodemailer from "nodemailer";

type DeletionEmailInput = {
  email: string;
  protocol: string;
};

export async function sendAccountDeletionEmail({
  email,
  protocol,
}: DeletionEmailInput): Promise<boolean> {
  const user = process.env.CONTACT_EMAIL_USER?.trim();
  const password = process.env.CONTACT_EMAIL_PASSWORD?.replace(/\s/g, "");

  if (!user || !password || !email) {
    return false;
  }

  const trackingUrl =
    "https://homenageando.com.br/exclusao-de-dados/status#" +
    protocol;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass: password,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  });

  try {
    const result = await transporter.sendMail({
      from: {
        name: "Homenageando",
        address: user,
      },
      to: email,
      subject: "Homenageando - Protocolo de exclusão de conta",
      text: [
        "Sua solicitação de exclusão de conta foi registrada.",
        "",
        "Protocolo: " + protocol,
        "",
        "Acompanhe sua solicitação:",
        trackingUrl,
        "",
        "Guarde este e-mail para futuras consultas.",
        "",
        "Esta mensagem não confirma que a exclusão já foi concluída.",
        "",
        "Homenageando",
      ].join("\n"),
    });

    return result.accepted.some(
      (address) => address.toLowerCase() === email.toLowerCase()
    );
  } catch {
    return false;
  } finally {
    transporter.close();
  }
}
