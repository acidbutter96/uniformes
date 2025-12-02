import { badRequest, ok, serverError } from '@/app/api/utils/responses';
import dbConnect from '@/src/lib/database';
import SupplierInviteModel from '@/src/lib/models/supplierInvite';
import SupplierModel from '@/src/lib/models/supplier';
import UserModel from '@/src/lib/models/user';
import { createUser } from '@/src/services/user.service';
import { hashPassword, isValidCpf, normalizeCpf } from '@/src/services/auth.service';

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
      cpf?: unknown;
      birthDate?: unknown;
      address?: unknown;
    } | null;

    if (!payload) {
      return badRequest('Payload inválido.');
    }

    const { token, name, email, password, cnpj, specialty, phone, cpf, birthDate, address } =
      payload;

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

    if (cpf !== undefined && typeof cpf !== 'string') {
      return badRequest('CPF inválido.');
    }

    if (birthDate !== undefined && typeof birthDate !== 'string') {
      return badRequest('Data de nascimento inválida.');
    }

    if (address !== undefined && typeof address !== 'object') {
      return badRequest('Endereço inválido.');
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

    // Optional user identity fields copied from user registration
    let normalizedCpf: string | undefined;
    if (typeof cpf === 'string' && cpf.trim()) {
      const cpfDigits = normalizeCpf(cpf.trim());
      if (!isValidCpf(cpfDigits)) {
        return badRequest('CPF inválido.');
      }
      normalizedCpf = cpfDigits;
    }

    let parsedBirthDate: Date | undefined;
    if (typeof birthDate === 'string' && birthDate.trim()) {
      const bd = new Date(birthDate);
      if (Number.isNaN(bd.getTime())) {
        return badRequest('Data de nascimento inválida.');
      }
      const today = new Date();
      if (bd > today) {
        return badRequest('Data de nascimento no futuro não é permitida.');
      }
      parsedBirthDate = bd;
    }

    let userAddress:
      | {
          cep: string;
          street: string;
          number?: string;
          complement?: string;
          district: string;
          city: string;
          state: string;
        }
      | undefined;
    if (address && typeof address === 'object' && address !== null) {
      const addr = address as Record<string, unknown>;
      const cep = typeof addr.cep === 'string' ? addr.cep.replace(/\D/g, '') : '';
      const street = typeof addr.street === 'string' ? addr.street.trim() : '';
      const number = typeof addr.number === 'string' ? addr.number.trim() : undefined;
      const complement = typeof addr.complement === 'string' ? addr.complement.trim() : undefined;
      const district = typeof addr.district === 'string' ? addr.district.trim() : '';
      const city = typeof addr.city === 'string' ? addr.city.trim() : '';
      const state = typeof addr.state === 'string' ? addr.state.trim().toUpperCase() : '';

      if (cep && cep.length !== 8) {
        return badRequest('CEP inválido.');
      }
      if (street && district && city && state) {
        userAddress = { cep, street, number, complement, district, city, state };
      } else if (cep || street || district || city || state) {
        return badRequest('Endereço incompleto.');
      }
    }
    const user = await createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: 'supplier',
      cpf: normalizedCpf,
      birthDate: parsedBirthDate,
      address: userAddress,
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
