import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import {
  transformarHojaExcel,
  parsearExcelCenso,
  sugerirMapeoColumnas,
  normalizarTorre,
} from './censo-excel.ts';

describe('censo-excel (Pipeline de Importación de Copropiedades)', () => {
  describe('transformarHojaExcel: Reglas de Menores y Contacto Principal', () => {
    it('debe reclasificar menores de 18 años a convivientes si vienen catalogados como propietarios', () => {
      const fechaMenor = new Date();
      fechaMenor.setFullYear(fechaMenor.getFullYear() - 15); // 15 años
      const fechaAdulto = new Date();
      fechaAdulto.setFullYear(fechaAdulto.getFullYear() - 40); // 40 años

      const rawRows = [
        {
          TORRE: '1',
          APTO: '301',
          PROPIETARIOS: 'SAMUEL BUSTAMANTE',
          IDENTIFICACION: '1029384756',
          EDAD: 15,
          FECHA_NAC: fechaMenor.toISOString().split('T')[0],
          TELEFONO: '3001234567',
        },
        {
          TORRE: '1',
          APTO: '301',
          PROPIETARIOS: 'YON JAIRO BUSTAMANTE',
          IDENTIFICACION: '79123456',
          EDAD: 40,
          FECHA_NAC: fechaAdulto.toISOString().split('T')[0],
          TELEFONO: '3109876543',
        },
      ];

      const mapeo = {
        TORRE: 'torre' as const,
        APTO: 'numeroApto' as const,
        PROPIETARIOS: 'nombrePropietario' as const,
        IDENTIFICACION: 'documento' as const,
        EDAD: 'edad' as const,
        FECHA_NAC: 'fechaNacimiento' as const,
        TELEFONO: 'telefono' as const,
      };

      const res = transformarHojaExcel(rawRows, mapeo);
      assert.equal(res.filasPreview.length, 1);
      const unidad = res.filasPreview[0];
      assert.equal(unidad.numeroApto, '301');

      const samuel = unidad.personas.find((p) => p.nombreCompleto === 'SAMUEL BUSTAMANTE');
      const yonJairo = unidad.personas.find((p) => p.nombreCompleto === 'YON JAIRO BUSTAMANTE');

      assert.ok(samuel);
      assert.ok(yonJairo);

      // Samuel (menor) debe ser conviviente y NO contacto principal
      assert.equal(samuel.condicion, 'conviviente');
      assert.equal(samuel.esContactoPrincipal, false);

      // Yon Jairo (adulto) debe ser propietario y contacto principal
      assert.equal(yonJairo.condicion, 'propietario');
      assert.equal(yonJairo.esContactoPrincipal, true);
    });
  });

  describe('parsearExcelCenso: Sanitización de Vehículos y Placas Reales', () => {
    it('debe detectar placas en columna color/marca y asegurar que NINGÚN vehículo tenga placa vacía', async () => {
      const wb = XLSX.utils.book_new();

      // Hoja PROPIETARIOS
      const wsProp = XLSX.utils.json_to_sheet([
        { TORRE: 1, APTO: 101, PROPIETARIOS: 'JUAN PEREZ' },
        { TORRE: 1, APTO: 102, PROPIETARIOS: 'ANA GOMEZ' },
        { TORRE: 3, APTO: 203, PROPIETARIOS: 'CARLOS DIAZ' },
        { TORRE: 4, APTO: 602, PROPIETARIOS: 'LUIS MOTO' },
      ]);
      XLSX.utils.book_append_sheet(wb, wsProp, 'PROPIETARIOS');

      // Hoja VEHICULOS con casos de placas reales de copropiedades
      const wsVeh = XLSX.utils.json_to_sheet([
        { TORRE: 1, APTO: 101, VEHICULO: 'AUTOMOVIL', PLACAS: 'ABC-123' },
        { TORRE: 1, APTO: 102, VEHICULO: 'AUTOMOVIL', PLACAS: 'CYS' }, // placa corta
        { TORRE: 3, APTO: 203, VEHICULO: 'AUTOMOVIL', MARCA: 'GRIS', COLOR: 'CXC-190' }, // placa en color
        { TORRE: 4, APTO: 602, VEHICULO: 'MOTO', MARCA: 'OFERO', COLOR: 'LILA', PLACAS: 'ELECTRICA' }, // moto eléctrica
        { TORRE: 1, APTO: 104 }, // Fila vacía (debe ignorarse)
      ]);
      XLSX.utils.book_append_sheet(wb, wsVeh, 'VEHICULOS');

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const file = new File([buf], 'test-copropiedad.xlsx');

      const parsed = await parsearExcelCenso(file);
      assert.equal(parsed.vehiculos.length, 4);

      // Ningún vehículo debe tener placa undefined o vacía
      for (const v of parsed.vehiculos) {
        assert.ok(v.placa, `Vehículo en apto ${v.apto} no debe tener placa vacía`);
        assert.ok(v.placa.length >= 3 && v.placa.length <= 10);
      }

      // Placa detectada en color para apto 203
      const v203 = parsed.vehiculos.find((v) => v.apto === '203');
      assert.ok(v203);
      assert.equal(v203.placa, 'CXC190');

      // Placa corta CYS
      const v102 = parsed.vehiculos.find((v) => v.apto === '102');
      assert.ok(v102);
      assert.equal(v102.placa, 'CYS');

      // Moto eléctrica
      const v602 = parsed.vehiculos.find((v) => v.apto === '602');
      assert.ok(v602);
      assert.equal(v602.placa, 'ELECTRICA');
    });
  });

  describe('Verificación con Archivo Real TEKA', () => {
    const tekaPath = 'C:/Users/juan.morales/Downloads/CONSOLIDADO BASE DE DATOS  APARTAMENTOS TEKA.xlsx';

    it('debe procesar el archivo TEKA sin errores de validación', async () => {
      if (!fs.existsSync(tekaPath)) {
        console.log('Archivo TEKA no presente en la máquina, omitiendo prueba');
        return;
      }

      const fileBuf = fs.readFileSync(tekaPath);
      const file = new File([fileBuf], 'CONSOLIDADO BASE DE DATOS  APARTAMENTOS TEKA.xlsx');

      const multi = await parsearExcelCenso(file);
      assert.equal(multi.inmuebles.length, 672);
      assert.ok(multi.residentes.length > 2000);
      assert.ok(multi.vehiculos.length > 700);

      // Verificar que todos los vehículos procesados tengan placa válida y no vacía
      for (const v of multi.vehiculos) {
        assert.ok(v.placa, `Vehículo apto ${v.apto} debe tener placa`);
        assert.ok(v.placa.length >= 3 && v.placa.length <= 10, `Placa "${v.placa}" debe tener entre 3 y 10 chars`);
      }
    });
  });
});
