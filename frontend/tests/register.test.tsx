import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axe from 'axe-core';
import Register from '../src/pages/Register';
import { ApiError, authApi } from '../src/services/api';

const mocks = vi.hoisted(() => ({ signIn: vi.fn(), refreshProfile: vi.fn() }));
vi.mock('../src/config/firebase', () => ({ auth: {}, googleProvider: {} }));
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: mocks.signIn, signInWithPopup: vi.fn(), signOut: vi.fn(),
}));
vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ refreshProfile: mocks.refreshProfile }),
}));

function renderRegister() {
  return render(<MemoryRouter initialEntries={['/registro']}><Routes>
    <Route path="/registro" element={<main><Register /></main>} />
    <Route path="/panel" element={<h1>Panel de estudio</h1>} />
  </Routes></MemoryRouter>);
}

async function fillForm(email = 'ana@correounivalle.edu.co', password = 'Prueba123') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/^Nombres/), 'Ana');
  await user.type(screen.getByLabelText(/^Apellidos/), 'Pérez');
  await user.type(screen.getByLabelText(/^Nombre de usuario/), 'ana_qa');
  await user.type(screen.getByLabelText(/^Correo institucional/), email);
  await user.type(screen.getByLabelText(/^Contraseña/, { selector: 'input' }), password);
  return user;
}

beforeEach(() => {
  vi.restoreAllMocks();
  mocks.signIn.mockReset().mockResolvedValue({});
  mocks.refreshProfile.mockReset().mockResolvedValue(undefined);
  vi.spyOn(authApi, 'checkUsernameAvailability').mockResolvedValue({ success: true, username: 'ana_qa', available: true });
  // Cualquier registro no configurado falla; nunca se accede a la API real.
  vi.spyOn(authApi, 'register').mockRejectedValue(new Error('Registro no configurado en la prueba'));
});

describe('PI-277 | registro manual (pruebas de componente)', () => {
  it('E1: envía el perfil y avatar elegidos, inicia sesión y redirige al panel', async () => {
    vi.mocked(authApi.register).mockResolvedValue({ success: true, user: {
      id: 'qa', firstName: 'Ana', lastName: 'Pérez', username: 'ana_qa',
      email: 'ana@correounivalle.edu.co', avatarUrl: null, provider: 'password',
      role: 'student', createdAt: null, updatedAt: null,
    } });
    renderRegister();
    const user = await fillForm();
    await user.click(screen.getByRole('radio', { name: 'Opción de avatar 2' }));
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    expect(await screen.findByRole('heading', { name: 'Panel de estudio' })).toBeInTheDocument();
    expect(authApi.register).toHaveBeenCalledExactlyOnceWith({
      firstName: 'Ana', lastName: 'Pérez', username: 'ana_qa',
      email: 'ana@correounivalle.edu.co', password: 'Prueba123',
      avatarUrl: 'https://api.dicebear.com/9.x/bottts/svg?seed=Aria',
    });
    expect(mocks.signIn).toHaveBeenCalledWith({}, 'ana@correounivalle.edu.co', 'Prueba123');
    expect(mocks.refreshProfile).toHaveBeenCalledOnce();
  });

  it.each([
    ['USERNAME_TAKEN', 'username', 'Nombre de usuario', 'Ese nombre ya está ocupado.'],
    ['EMAIL_TAKEN', 'email', 'Correo institucional', 'Ese correo ya está registrado.'],
  ])('E2/E3: %s se asocia al campo y conserva los datos', async (code, field, label, message) => {
    vi.mocked(authApi.register).mockRejectedValue(new ApiError(409, code, 'Revisa el formulario.', [{ field, message }]));
    renderRegister();
    const user = await fillForm();
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    await waitFor(() => expect(screen.getByLabelText(new RegExp(`^${label}`))).toHaveAccessibleDescription(message));
    expect(screen.getByLabelText(/^Nombres/)).toHaveValue('Ana');
    expect(screen.getByLabelText(/^Apellidos/)).toHaveValue('Pérez');
    expect(screen.getByLabelText(/^Nombre de usuario/)).toHaveValue('ana_qa');
    expect(screen.getByLabelText(/^Correo institucional/)).toHaveValue('ana@correounivalle.edu.co');
    expect(screen.getByLabelText(/^Contraseña/, { selector: 'input' })).toHaveValue('Prueba123');
    expect(screen.getByRole('link', { name: 'Inicia sesión aquí' })).toHaveAttribute('href', '/ingreso');
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(mocks.refreshProfile).not.toHaveBeenCalled();
  });

  it('E4: campos vacíos muestran cinco errores anunciables y no registran', async () => {
    renderRegister();
    await userEvent.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    expect(screen.getAllByRole('alert')).toHaveLength(5);
    for (const label of [/^Nombres/, /^Apellidos/, /^Nombre de usuario/, /^Correo institucional/, /^Contraseña/]) {
      expect(screen.getByLabelText(label, { selector: 'input' })).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText(label, { selector: 'input' })).toHaveAccessibleDescription();
    }
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it.each(['Abc1234', 'abcdefgh', '12345678'])('E4: contraseña inválida %s impide registrar', async password => {
    renderRegister();
    const user = await fillForm('ana@correounivalle.edu.co', password);
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    expect(screen.getByLabelText(/^Contraseña/, { selector: 'input' })).toHaveAttribute('aria-invalid', 'true');
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('E4: correo sin arroba no debe enviarse a la API (regresión QA-01)', async () => {
    renderRegister();
    const user = await fillForm('invalido.edu.co');
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    expect(authApi.register).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^Correo institucional/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('deshabilita el envío mientras registra y permite reintentar tras error de red', async () => {
    let rejectRequest!: (reason: Error) => void;
    vi.mocked(authApi.register).mockImplementation(() => new Promise((_resolve, reject) => { rejectRequest = reject; }));
    renderRegister();
    const user = await fillForm();
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    expect(screen.getByRole('button', { name: 'Creando cuenta...' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Creando cuenta...' }));
    expect(authApi.register).toHaveBeenCalledOnce();
    rejectRequest(new Error('Sin conexión'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Intenta de nuevo');
    expect(screen.getByRole('button', { name: 'Crear mi cuenta' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    expect(authApi.register).toHaveBeenCalledTimes(2);
  });
});

describe('PI-278 | accesibilidad automatizada parcial', () => {
  it('recorre los campos por teclado y permite mostrar/ocultar la contraseña', async () => {
    renderRegister();
    const user = userEvent.setup();
    for (const label of [/^Nombres/, /^Apellidos/, /^Nombre de usuario/, /^Correo institucional/, /^Contraseña/]) {
      await user.tab();
      expect(screen.getByLabelText(label, { selector: 'input' })).toHaveFocus();
    }
    await user.tab();
    const showPassword = screen.getByRole('button', { name: 'Mostrar contraseña' });
    expect(showPassword).toHaveFocus();
    expect(showPassword).toHaveTextContent('Mostrar');
    expect(showPassword).toHaveAttribute('aria-pressed', 'false');
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText(/^Contraseña/, { selector: 'input' })).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText(/^Contraseña/, { selector: 'input' })).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toHaveAttribute('aria-pressed', 'false');
    await user.tab();
    expect(screen.getByRole('radio', { name: 'Opción de avatar 1' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Opción de avatar 2' })).toBeChecked();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Crear mi cuenta' })).toHaveFocus();
  });

  it('QA-02: no desactiva el foco visible de campos ni avatares', () => {
    renderRegister();
    for (const label of [/^Nombres/, /^Apellidos/, /^Nombre de usuario/, /^Correo institucional/, /^Contraseña/]) {
      const input = screen.getByLabelText(label, { selector: 'input' });
      expect(input.className).not.toContain('focus-visible:outline-none');
      expect(input.className).not.toContain('focus-visible:ring-0');
    }
    const radio = screen.getByRole('radio', { name: 'Opción de avatar 1' });
    expect(radio.closest('label')?.className).toContain('has-[:focus-visible]:ring-2');
  });

  it('QA-03: el nombre accesible del botón contiene su texto visible y anuncia el estado', async () => {
    renderRegister();
    const user = userEvent.setup();
    const show = screen.getByRole('button', { name: 'Mostrar contraseña' });
    expect(show).toHaveTextContent('Mostrar');
    expect(show).toHaveAttribute('aria-pressed', 'false');
    await user.click(show);
    const hide = screen.getByRole('button', { name: 'Ocultar contraseña' });
    expect(hide).toHaveTextContent('Ocultar');
    expect(hide).toHaveAttribute('aria-pressed', 'true');
  });

  it.each([false, true])('axe sin violaciones estructurales, errores visibles: %s', async showErrors => {
    const { container } = renderRegister();
    if (showErrors) await userEvent.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      // JSDOM no calcula contraste/layout; se auditan en navegador publicado.
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations).toEqual([]);
  });
});
