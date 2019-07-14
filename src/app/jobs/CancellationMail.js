import pt from 'date-fns/locale/pt-BR';
import { format, parseISO } from 'date-fns';
import Mail from '../../lib/Mail';

class CancellatioMail {
  get key() {
    return 'CancelationMail';
  }

  async handle({ data }) {
    const { appointment } = data;

    console.log('A fila Executou');
    await Mail.sendMail({
      to: `${appointment.provider.name} <${appointment.provider.email}>`,
      subject: 'Agendamento cancelado',

      template: 'cancellation',
      context: {
        provider: appointment.provider.name,
        user: appointment.user.name,
        date: format(
          parseISO(appointment.date, "'dia ' dd 'de 'MMMM', às' H:mm'h'", {
            locale: pt,
          })
        ),
      },
    });
  }
}
export default new CancellatioMail();