import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt-BR';
import User from '../models/User';
import File from '../models/File';
import Appointment from '../models/Appointment';
import Notification from '../schemas/Notification';

class AppointmentController {
  async index(req, res) {
    const { page = 1 } = req.query;
    const appointments = await Appointment.findAll({
      where: { user_id: req.userId, cancelad_at: null },
      order: ['date'],
      attributes: ['id', 'date'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });

    return res.json(appointments);
  }

  async store(req, res) {
    /** Validação */
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validação falha' });
    }

    const { provider_id, date } = req.body;

    /** Chegando se o usuario tem provider */
    const checkIsProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    if (!checkIsProvider) {
      return res.status(401).json({ error: 'Voce não criou Appointments' });
    }
    /**
     * Checando a data
     */
    const hourStart = startOfHour(parseISO(date));

    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Data passada' });
    }
    /** checando se tem agendamento */

    const checkAvailabily = await Appointment.findOne({
      where: {
        provider_id,
        cancelad_at: null,
        date: hourStart,
      },
    });

    if (checkAvailabily) {
      return res.status(400).json({ error: 'Ja existe nessa data' });
    }
    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date,
    });
    const user = await User.findByPk(req.userId);
    const formattDate = format(hourStart, "'dia ' dd 'de 'MMMM', às' H:mm'h'", {
      locale: pt,
    });
    /** *Noticar prestador */
    await Notification.create({
      content: `Novo Agendamento de ${user.name} para ${formattDate}`,
      user: provider_id,
    });

    return res.json(appointment);
  }

  async delete(req, res) {
    const appointment = await Appointment.findByPk(req.params.id);

    if (appointment.user_id !== req.userId) {
      return res.status(401).json({
        error: 'Voce nao tem permição para cancelar esse appointment',
      });
    }

    const dateWithSub = subHours(appointment.date, 2);

    if (isBefore(dateWithSub, new Date())) {
      return res.status(401).json({
        error: 'Voce nao pode cancelar appontments 2 h antes ',
      });
    }
    appointment.cancelad_at = new Date();

    await appointment.save();

    return res.json(appointment);
  }
}
export default new AppointmentController();
