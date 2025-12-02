import { badRequest, ok, serverError } from '@/app/api/utils/responses';
import dbConnect from '@/src/lib/database';
import SupplierInviteModel from '@/src/lib/models/supplierInvite';
import SupplierModel from '@/src/lib/models/supplier';
import UserModel from '@/src/lib/models/user';
import { createUser } from '@/src/services/user.service';
import { hashPassword } from '@/src/services/auth.service';

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as {
      token?: unknown;
      name?: unknown;
      email?: unknown;
      password?: unknown;
      cnpj?: unknown;
      specialty?: unknown;
      phone?: unknown;
    } | null;

    if (!payload) {
      return badRequest('Payload inválido.');
    }

    const { token, name, email, password, cnpj, specialty, phone } = payload;

    if (typeof token !== 'string' || !token.trim()) {
      return badRequest('Token é obrigatório.');
    }

    if (typeof name !== 'string' || !name.trim()) {
      return badRequest('Nome da empresa é obrigatório.');
    }

    if (typeof email !== 'string' || !email.trim()) {
      return badRequest('Email é obrigatório.');
    }

    if (typeof password !== 'string' || password.length < 6) {
      return badRequest('Senha deve ter ao menos 6 caracteres.');
    }

    if (cnpj !== undefined && typeof cnpj !== 'string') {
      return badRequest('CNPJ inválido.');
    }

    if (specialty !== undefined && typeof specialty !== 'string') {
      return badRequest('Especialidade inválida.');
    }

    if (phone !== undefined && typeof phone !== 'string') {
      return badRequest('Telefone inválido.');
    }

    await dbConnect();

    const invite = await SupplierInviteModel.findOne({ token }).exec();
    if (!invite) {
      return badRequest('Convite inválido ou não encontrado.');
    }

    if (invite.usedAt) {
      return badRequest('Este convite já foi utilizado.');
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      return badRequest('Este convite expirou.');
    }

    const existingUser = await UserModel.findOne({ email: email.trim().toLowerCase() }).exec();
    if (existingUser) {
      return badRequest('Já existe um usuário cadastrado com este email.');
    }

    const hashedPassword = await hashPassword(password);

    const supplier = await SupplierModel.create({
      name: name.trim(),
      cnpj: typeof cnpj === 'string' ? cnpj.trim() : undefined,
      specialty: typeof specialty === 'string' ? specialty.trim() : undefined,
      phone: typeof phone === 'string' ? phone.trim() : undefined,
    });

    const user = await createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: 'supplier',
    });

    await UserModel.updateOne({ _id: user._id }, { $set: { supplierId: supplier._id } }).exec();

    invite.usedAt = new Date();
    await invite.save();

    return ok({
      supplierId: supplier._id.toString(),
      userId: user._id.toString(),
    });
  } catch (error) {
    console.error('Failed to register supplier via token', error);
    return serverError('Não foi possível concluir o cadastro do fornecedor.');
  }
}
