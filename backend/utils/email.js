const getMailer = async () => {
    try {
        const nodemailer = await import("nodemailer")
        return nodemailer.default
    } catch (error) {
        console.log("Email disabled: nodemailer is not installed")
        return null
    }
}

const getTransporter = async () => {
    const nodemailer = await getMailer()

    if (!nodemailer) {
        return null
    }

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
        console.log("Email disabled: SMTP env variables are missing")
        return null
    }

    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    })
}

const sendEmail = async ({ to, subject, text }) => {
    if (!to) {
        return
    }

    try {
        const transporter = await getTransporter()

        if (!transporter) {
            return
        }

        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            subject,
            text,
        })
    } catch (error) {
        console.log("Email send failed:", error.message)
    }
}

const sendAppointmentBookedEmails = async ({ userData, doctor, slotDate, slotTime }) => {
    const doctorName = doctor.name
    const patientName = userData.name

    await Promise.all([
        sendEmail({
            to: userData.email,
            subject: "Appointment booked successfully",
            text: `Hi ${patientName}, your appointment with Dr. ${doctorName} is booked for ${slotDate} at ${slotTime}.`,
        }),
        sendEmail({
            to: doctor.email,
            subject: "New appointment booked",
            text: `Hi Dr. ${doctorName}, ${patientName} has booked an appointment with you for ${slotDate} at ${slotTime}.`,
        }),
    ])
}

const sendAppointmentCancelledEmails = async ({ appointmentData, cancelledBy = "doctor" }) => {
    const userData = appointmentData.userData
    const docData = appointmentData.docData
    const doctorEmail = appointmentData.doctorEmail || docData.email
    const doctorName = docData.name
    const patientName = userData.name
    const reasonText = cancelledBy === "doctor" ? `Dr. ${doctorName}` : "the clinic"

    await Promise.all([
        sendEmail({
            to: userData.email,
            subject: "Appointment cancelled",
            text: `Hi ${patientName}, your appointment with Dr. ${doctorName} for ${appointmentData.slotDate} at ${appointmentData.slotTime} was cancelled by ${reasonText}.`,
        }),
        sendEmail({
            to: doctorEmail,
            subject: "Appointment cancelled",
            text: `Hi Dr. ${doctorName}, the appointment with ${patientName} for ${appointmentData.slotDate} at ${appointmentData.slotTime} was cancelled.`,
        }),
    ])
}

export {
    sendAppointmentBookedEmails,
    sendAppointmentCancelledEmails,
}
