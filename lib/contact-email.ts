import "server-only";
import nodemailer from "nodemailer";

const CONTACT_SUBJECTS = {
  duvida: "Dúvida",
  musica: "Problema com a música",
  pagamento: "Pagamento",
  reembolso: "Cancelamento ou reembolso",
  privacidade: "Privacidade",
} as const;

type ContactSubject = keyof typeof CONTACT_SUBJECTS;

type ContactMessage = {
  name: string;
  email: string;
  subject: ContactSubject;
  message: string;
};

function isValidEmail(value: string): boolean {
  return (
    value.length <= 254 &&
    !/[\r\n]/.test(value) &&
    /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)
  );
}

export async function sendContactEmail(input: ContactMessage) {
  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();

  if (
    name.length < 2 ||
    name.length > 120 ||
    /[\r\n]/.test(name) ||
    !isValidEmail(email) ||
    !Object.prototype.hasOwnProperty.call(CONTACT_SUBJECTS, input.subject) ||
    message.length < 10 ||
    message.length > 5000
  ) {
    throw new Error("CONTACT_INVALID_INPUT");
  }

  const user = process.env.CONTACT_EMAIL_USER?.trim();
  const password = process.env.CONTACT_EMAIL_PASSWORD?.replace(/\s/g, "");
  const destination = process.env.CONTACT_EMAIL_TO?.trim();

  if (
    !user ||
    !password ||
    !destination ||
    !isValidEmail(user) ||
    !isValidEmail(destination)
  ) {
    throw new Error("CONTACT_NOT_CONFIGURED");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass: password,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  });

  const subjectLabel = CONTACT_SUBJECTS[input.subject];

  try {
    const result = await transporter.sendMail({
      from: {
        name: "Homenageando — Contato",
        address: user,
      },
      to: {
        name: "Atendimento Homenageando",
        address: destination,
      },
      replyTo: {
        name,
        address: email,
      },
      subject: `[Homenageando] ${subjectLabel}`,
      text: [
        "Nova mensagem pelo formulário de contato",
        "",
        `Nome: ${name}`,
        `E-mail: ${email}`,
        `Assunto: ${subjectLabel}`,
        "",
        "Mensagem:",
        message,
      ].join("\n"),
    });

    if (result.accepted.length === 0) {
      throw new Error("CONTACT_NOT_ACCEPTED");
    }
  } catch {
    throw new Error("CONTACT_SEND_FAILED");
  } finally {
    transporter.close();
  }
}