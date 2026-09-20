// scratch/test_movimientos.js
// Script de pruebas de integración para el módulo de Movimientos de Ahorro

const API_BASE = 'http://localhost:4000/api';

async function request(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
}

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FALLÓ: ${message}`);
        process.exit(1);
    } else {
        console.log(`  ✓ ${message}`);
    }
}

async function runTests() {
    console.log('\n======================================================');
    console.log('🚀 INICIANDO PRUEBAS OBLIGATORIAS: MOVIMIENTOS DE AHORRO');
    console.log('======================================================\n');

    // 0. Preparar metas de prueba
    console.log('📋 Preparando metas de prueba...');
    const metaARes = await request('/metas', {
        method: 'POST',
        body: JSON.stringify({ nombre: 'Test Meta Laptop', monto_meta: 10000 }),
    });
    assert(metaARes.status === 201, 'Meta A creada exitosamente');
    const metaAId = metaARes.data.id;
    assert(metaARes.data.saldo === 0, 'Meta A inicia con saldo $0');

    const metaBRes = await request('/metas', {
        method: 'POST',
        body: JSON.stringify({ nombre: 'Test Meta Vacaciones', monto_meta: 20000 }),
    });
    assert(metaBRes.status === 201, 'Meta B creada exitosamente');
    const metaBId = metaBRes.data.id;
    assert(metaBRes.data.saldo === 0, 'Meta B inicia con saldo $0');

    // ── Caso 1: INGRESO ($2,000) ───────────────────────────
    console.log('\n--- CASO 1: Primer INGRESO ($2,000) ---');
    const mov1Res = await request('/movimientos', {
        method: 'POST',
        body: JSON.stringify({
            id_meta: metaAId,
            tipo: 'INGRESO',
            monto: 2000,
            fecha: new Date().toISOString(),
        }),
    });
    assert(mov1Res.status === 201, 'Movimiento 1 (INGRESO $2,000) creado con código 201');
    const mov1Id = mov1Res.data.id;

    const metaACheck1 = await request(`/metas/${metaAId}`);
    assert(metaACheck1.data.saldo === 2000, `Saldo de Meta A es $2,000 (actual: $${metaACheck1.data.saldo})`);

    // ── Caso 2: Segundo INGRESO ($3,000) ───────────────────
    console.log('\n--- CASO 2: Segundo INGRESO ($3,000) ---');
    const mov2Res = await request('/movimientos', {
        method: 'POST',
        body: JSON.stringify({
            id_meta: metaAId,
            tipo: 'INGRESO',
            monto: 3000,
            fecha: new Date().toISOString(),
        }),
    });
    assert(mov2Res.status === 201, 'Movimiento 2 (INGRESO $3,000) creado con código 201');
    const mov2Id = mov2Res.data.id;

    const metaACheck2 = await request(`/metas/${metaAId}`);
    assert(metaACheck2.data.saldo === 5000, `Saldo de Meta A es $5,000 (actual: $${metaACheck2.data.saldo})`);

    // ── Caso 3: EGRESO ($1,000) ────────────────────────────
    console.log('\n--- CASO 3: EGRESO ($1,000) ---');
    const mov3Res = await request('/movimientos', {
        method: 'POST',
        body: JSON.stringify({
            id_meta: metaAId,
            tipo: 'EGRESO',
            monto: 1000,
            fecha: new Date().toISOString(),
        }),
    });
    assert(mov3Res.status === 201, 'Movimiento 3 (EGRESO $1,000) creado con código 201');
    const mov3Id = mov3Res.data.id;

    const metaACheck3 = await request(`/metas/${metaAId}`);
    assert(metaACheck3.data.saldo === 4000, `Saldo de Meta A es $4,000 (actual: $${metaACheck3.data.saldo})`);

    // ── Caso 4: EGRESO superior al saldo ($5,000 > $4,000) ──
    console.log('\n--- CASO 4: EGRESO superior al saldo ($5,000) ---');
    const mov4BadRes = await request('/movimientos', {
        method: 'POST',
        body: JSON.stringify({
            id_meta: metaAId,
            tipo: 'EGRESO',
            monto: 5000,
            fecha: new Date().toISOString(),
        }),
    });
    assert(mov4BadRes.status === 400, 'Egreso excesivo rechazado con código 400');
    assert(mov4BadRes.data.error.includes('No puedes retirar') || mov4BadRes.data.error.includes('saldo'), 'Mensaje de error claro sobre saldo insuficiente');

    const metaACheck4 = await request(`/metas/${metaAId}`);
    assert(metaACheck4.data.saldo === 4000, `Saldo de Meta A permanece intacto en $4,000 (actual: $${metaACheck4.data.saldo})`);

    // ── Caso 5: Editar monto ($2,000 -> $2,500) ────────────
    console.log('\n--- CASO 5: Editar monto (Movimiento 1 de $2,000 a $2,500) ---');
    const mov1EditRes = await request(`/movimientos/${mov1Id}`, {
        method: 'PUT',
        body: JSON.stringify({
            monto: 2500,
        }),
    });
    assert(mov1EditRes.status === 200, 'Movimiento 1 actualizado a $2,500');
    assert(mov1EditRes.data.monto === 2500, 'Monto del movimiento 1 es $2,500');

    const metaACheck5 = await request(`/metas/${metaAId}`);
    // Saldo previo: 4000. Revertir 2000 (-> 2000) + Aplicar 2500 (-> 4500)
    assert(metaACheck5.data.saldo === 4500, `Saldo de Meta A recalculado a $4,500 (actual: $${metaACheck5.data.saldo})`);

    // ── Caso 6: Cambiar tipo (INGRESO -> EGRESO y viceversa) ─
    console.log('\n--- CASO 6: Cambiar tipo ---');
    // Creamos un movimiento temporal de INGRESO $500
    const movTempRes = await request('/movimientos', {
        method: 'POST',
        body: JSON.stringify({
            id_meta: metaAId,
            tipo: 'INGRESO',
            monto: 500,
            fecha: new Date().toISOString(),
        }),
    });
    assert(movTempRes.status === 201, 'Movimiento temporal creado (INGRESO $500)');
    const movTempId = movTempRes.data.id;

    // Saldo ahora es 4500 + 500 = 5000
    let metaACheck6 = await request(`/metas/${metaAId}`);
    assert(metaACheck6.data.saldo === 5000, `Saldo de Meta A es $5,000`);

    // Cambiamos de INGRESO $500 a EGRESO $500
    // Efecto: 5000 - 500 (revertir ingreso) - 500 (aplicar egreso) = 4000
    const changeTipoRes = await request(`/movimientos/${movTempId}`, {
        method: 'PUT',
        body: JSON.stringify({
            tipo: 'EGRESO',
        }),
    });
    assert(changeTipoRes.status === 200, 'Cambio de INGRESO a EGRESO exitoso');
    metaACheck6 = await request(`/metas/${metaAId}`);
    assert(metaACheck6.data.saldo === 4000, `Saldo tras cambiar tipo es $4,000 (actual: $${metaACheck6.data.saldo})`);

    // Cambiamos de nuevo a INGRESO $500 (-> 5000)
    const changeTipoBackRes = await request(`/movimientos/${movTempId}`, {
        method: 'PUT',
        body: JSON.stringify({
            tipo: 'INGRESO',
        }),
    });
    assert(changeTipoBackRes.status === 200, 'Cambio de EGRESO a INGRESO exitoso');
    metaACheck6 = await request(`/metas/${metaAId}`);
    assert(metaACheck6.data.saldo === 5000, `Saldo tras revertir tipo es $5,000 (actual: $${metaACheck6.data.saldo})`);

    // ── Caso 7: Cambiar meta (Movimiento transferido de Meta A a Meta B) ──
    console.log('\n--- CASO 7: Cambiar meta (Mover movTemp INGRESO $500 de Meta A a Meta B) ---');
    // Meta A tiene 5000, Meta B tiene 0
    const changeMetaRes = await request(`/movimientos/${movTempId}`, {
        method: 'PUT',
        body: JSON.stringify({
            id_meta: metaBId,
        }),
    });
    assert(changeMetaRes.status === 200, 'Movimiento transferido a Meta B');

    const metaACheck7 = await request(`/metas/${metaAId}`);
    const metaBCheck7 = await request(`/metas/${metaBId}`);
    assert(metaACheck7.data.saldo === 4500, `Meta A redujo su saldo a $4,500 (actual: $${metaACheck7.data.saldo})`);
    assert(metaBCheck7.data.saldo === 500, `Meta B incrementó su saldo a $500 (actual: $${metaBCheck7.data.saldo})`);

    // ── Caso 8: Eliminar movimiento ────────────────────────
    console.log('\n--- CASO 8: Eliminar movimiento (Eliminar movTemp en Meta B) ---');
    const deleteRes = await request(`/movimientos/${movTempId}`, {
        method: 'DELETE',
    });
    assert(deleteRes.status === 200, 'Movimiento temporal eliminado con código 200');

    const metaBCheck8 = await request(`/metas/${metaBId}`);
    assert(metaBCheck8.data.saldo === 0, `Saldo de Meta B volvió a $0 tras eliminar ingreso (actual: $${metaBCheck8.data.saldo})`);

    // ── Caso 9: Filtros y Resumen ──────────────────────────
    console.log('\n--- CASO 9: Filtros y Resumen ---');
    const summaryRes = await request(`/movimientos/summary?id_meta=${metaAId}`);
    assert(summaryRes.status === 200, 'Resumen obtenido exitosamente');
    // En Meta A tenemos: mov1 (INGRESO 2500), mov2 (INGRESO 3000), mov3 (EGRESO 1000)
    // total_ingresos: 5500, total_egresos: 1000, balance: 4500, total_movimientos: 3
    assert(summaryRes.data.total_ingresos === 5500, `Total ingresos en Meta A: $5,500 (actual: $${summaryRes.data.total_ingresos})`);
    assert(summaryRes.data.total_egresos === 1000, `Total egresos en Meta A: $1,000 (actual: $${summaryRes.data.total_egresos})`);
    assert(summaryRes.data.balance === 4500, `Balance neto en Meta A: $4,500 (actual: $${summaryRes.data.balance})`);
    assert(summaryRes.data.total_movimientos === 3, `Total movimientos en Meta A: 3 (actual: ${summaryRes.data.total_movimientos})`);

    const filterTipoIngreso = await request(`/movimientos?id_meta=${metaAId}&tipo=INGRESO`);
    assert(filterTipoIngreso.status === 200 && filterTipoIngreso.data.length === 2, 'Filtro por tipo INGRESO retorna 2 registros');

    const filterTipoEgreso = await request(`/movimientos?id_meta=${metaAId}&tipo=EGRESO`);
    assert(filterTipoEgreso.status === 200 && filterTipoEgreso.data.length === 1, 'Filtro por tipo EGRESO retorna 1 registro');

    // ── Caso 10: Verificación de Consistencia Matemática ───
    console.log('\n--- CASO 10: Verificación de Consistencia Matemática ---');
    const allMetasRes = await request('/metas');
    assert(allMetasRes.status === 200, 'Listado de metas obtenido');

    for (const m of allMetasRes.data) {
        const movsForMeta = await request(`/movimientos?id_meta=${m.id}`);
        let sumIngresos = 0;
        let sumEgresos = 0;
        for (const mv of movsForMeta.data) {
            if (mv.tipo === 'INGRESO') sumIngresos += mv.monto;
            if (mv.tipo === 'EGRESO') sumEgresos += mv.monto;
        }
        const expectedSaldo = Number((sumIngresos - sumEgresos).toFixed(2));
        const storedSaldo = Number(m.saldo.toFixed(2));

        assert(
            storedSaldo === expectedSaldo,
            `Consistencia verificada para meta "${m.nombre}" (ID: ${m.id}): Saldo ${storedSaldo} === INGRESOS(${sumIngresos}) - EGRESOS(${sumEgresos}) = ${expectedSaldo}`
        );
    }

    // Limpieza de metas de prueba
    console.log('\n🧹 Limpiando datos de prueba...');
    // Eliminar movimientos de meta A
    const movsMetaA = await request(`/movimientos?id_meta=${metaAId}`);
    for (const mv of movsMetaA.data) {
        await request(`/movimientos/${mv.id}`, { method: 'DELETE' });
    }
    await request(`/metas/${metaAId}`, { method: 'DELETE' });
    await request(`/metas/${metaBId}`, { method: 'DELETE' });
    console.log('✓ Limpieza completada.');

    console.log('\n======================================================');
    console.log('🎉 TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO AL 100%');
    console.log('======================================================\n');
}

runTests().catch((err) => {
    console.error('Error fatal durante la ejecución de pruebas:', err);
    process.exit(1);
});
