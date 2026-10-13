import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularEdad,
  categorizarEdad,
  validarFechaNacimiento,
  validarTelefono,
  validarPlaca,
  FECHA_MAX_NACIMIENTO,
  FECHA_MIN_NACIMIENTO,
} from './censo-helpers.ts';

describe('censo-helpers (Frontend Validations & Rules)', () => {
  describe('calcularEdad', () => {
    it('debe retornar 0 para fechas vacías o inválidas', () => {
      assert.equal(calcularEdad(''), 0);
      assert.equal(calcularEdad('invalida'), 0);
    });

    it('debe calcular la edad exacta en base al año y mes actual', () => {
      const hoy = new Date();
      const hace20 = new Date(hoy.getFullYear() - 20, hoy.getMonth(), hoy.getDate() - 1);
      assert.equal(calcularEdad(hace20), 20);

      const hace30CumpleManana = new Date(hoy.getFullYear() - 30, hoy.getMonth(), hoy.getDate() + 2);
      assert.equal(calcularEdad(hace30CumpleManana), 29);
    });
  });

  describe('categorizarEdad', () => {
    it('debe categorizar como menor a menores de 18 años con badge de info', () => {
      const cat = categorizarEdad(17);
      assert.equal(cat.key, 'menor');
      assert.equal(cat.label, 'Menor de edad');
      assert.ok(cat.badgeClass.includes('badge-info'));
    });

    it('debe categorizar como adulto entre 18 y 59 años', () => {
      const cat18 = categorizarEdad(18);
      assert.equal(cat18.key, 'adulto');
      assert.equal(cat18.label, 'Adulto');

      const cat45 = categorizarEdad(45);
      assert.equal(cat45.key, 'adulto');
    });

    it('debe categorizar como adulto mayor a personas de 60 años o más', () => {
      const cat60 = categorizarEdad(60);
      assert.equal(cat60.key, 'adulto_mayor');
      assert.equal(cat60.label, 'Adulto mayor');
      assert.ok(cat60.badgeClass.includes('badge-warning'));

      const cat80 = categorizarEdad(80);
      assert.equal(cat80.key, 'adulto_mayor');
    });
  });

  describe('validarFechaNacimiento', () => {
    it('debe rechazar fechas vacías o inválidas', () => {
      const resVacio = validarFechaNacimiento('');
      assert.equal(resVacio.valido, false);

      const resInvalida = validarFechaNacimiento('no-es-fecha');
      assert.equal(resInvalida.valido, false);
    });

    it('debe rechazar fechas futuras', () => {
      const hoy = new Date();
      const manana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 2);
      const res = validarFechaNacimiento(manana.toISOString().split('T')[0]);
      assert.equal(res.valido, false);
      assert.ok(res.mensaje?.includes('futura'));
    });

    it('debe rechazar personas con más de 125 años', () => {
      const res = validarFechaNacimiento('1850-01-01');
      assert.equal(res.valido, false);
      assert.ok(res.mensaje?.includes('125'));
    });

    it('debe aceptar fechas válidas de adultos y menores', () => {
      const res = validarFechaNacimiento('1998-07-15');
      assert.equal(res.valido, true);
      assert.ok(res.edad >= 25);
    });

    it('debe verificar que FECHA_MAX_NACIMIENTO coincide con hoy', () => {
      const hoyStr = new Date().toISOString().split('T')[0];
      assert.equal(FECHA_MAX_NACIMIENTO, hoyStr);
      assert.ok(FECHA_MIN_NACIMIENTO < hoyStr);
    });
  });

  describe('validarTelefono', () => {
    it('debe ser opcional (vacío es válido)', () => {
      assert.equal(validarTelefono('').valido, true);
      assert.equal(validarTelefono('   ').valido, true);
    });

    it('debe validar números de teléfono con 7 a 15 dígitos numéricos', () => {
      assert.equal(validarTelefono('3001234567').valido, true);
      assert.equal(validarTelefono('+57 310 987 6543').valido, true);
      assert.equal(validarTelefono('(601) 7458900').valido, true);
    });

    it('debe rechazar números con letras o longitud errónea', () => {
      assert.equal(validarTelefono('12345').valido, false);
      assert.equal(validarTelefono('300-ABC-4567').valido, false);
    });
  });

  describe('validarPlaca', () => {
    it('debe requerir placa si está vacía', () => {
      assert.equal(validarPlaca('').valido, false);
      assert.equal(validarPlaca('   ').valido, false);
    });

    it('debe validar placas con longitud entre 5 y 8 caracteres (ej. carros o motos)', () => {
      assert.equal(validarPlaca('ABC123').valido, true);
      assert.equal(validarPlaca('xyz 789').valido, true);
      assert.equal(validarPlaca('ABC12D').valido, true);
    });

    it('debe rechazar placas con menos de 5 o más de 8 caracteres', () => {
      assert.equal(validarPlaca('AB').valido, false);
      assert.equal(validarPlaca('ABCD12345').valido, false);
    });
  });
});
