// scratch/test_dashboard.js
// Script de pruebas de integración para el módulo Dashboard / Resumen Financiero

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
    console.log('🚀 INICIANDO PRUEBAS DEL DASHBOARD FINANCIERO');
    console.log('======================================================\n');

    // ── 1. Consultar Dashboard General ───────────────────
    console.log('--- PRUEBA 1: Consulta del Dashboard ---');
    const dashRes = await request('/dashboard?mes=2026-09-01');
    assert(dashRes.status === 200, 'GET /dashboard respondió con código 200');
    assert(dashRes.data.mes_seleccionado === '2026-09-01', 'Mes seleccionado normalizado a 2026-09-01');
    assert(dashRes.data.mes_nombre.includes('2026'), `Nombre de mes amigable: "${dashRes.data.mes_nombre}"`);
    assert(typeof dashRes.data.resumen === 'object', 'Objeto de resumen presente');
    assert(Array.isArray(dashRes.data.historico_mensual), 'Histórico mensual es un arreglo');
    assert(Array.isArray(dashRes.data.gastos_por_categoria), 'Gastos por categoría es un arreglo');
    assert(Array.isArray(dashRes.data.limites), 'Límites es un arreglo');
    assert(Array.isArray(dashRes.data.metas), 'Metas es un arreglo');
    assert(Array.isArray(dashRes.data.ultimos_movimientos), 'Últimos movimientos es un arreglo');

    // ── 2. Verificación de Balance y Resumen ──────────────
    console.log('\n--- PRUEBA 2: Consistencia Matemática del Resumen ---');
    const { total_ingresos, total_egresos, balance, ahorro_acumulado, metas_activas } = dashRes.data.resumen;
    console.log(`  📊 Ingresos: $${total_ingresos} | Egresos: $${total_egresos} | Balance: $${balance} | Ahorro: $${ahorro_acumulado}`);
    
    assert(
        Number((total_ingresos - total_egresos).toFixed(2)) === balance,
        `Balance calculado coincide exactamente: ${total_ingresos} - ${total_egresos} = ${balance}`
    );
    assert(
        ahorro_acumulado >= 0,
        `Ahorro acumulado no es negativo: $${ahorro_acumulado}`
    );

    // ── 3. Verificación de Histórico Mensual ──────────────
    console.log('\n--- PRUEBA 3: Estructura de Histórico Mensual (Gráfico 1) ---');
    assert(dashRes.data.historico_mensual.length === 5, `Histórico contiene 5 meses (actual: ${dashRes.data.historico_mensual.length})`);
    dashRes.data.historico_mensual.forEach((hm) => {
        assert(typeof hm.mes === 'string' && typeof hm.ingresos === 'number' && typeof hm.egresos === 'number', `Mes ${hm.mes} (${hm.mes_key}): Ingresos $${hm.ingresos}, Egresos $${hm.egresos}`);
    });

    // ── 4. Verificación de Gastos por Categoría ───────────
    console.log('\n--- PRUEBA 4: Distribución de Gastos por Categoría (Gráfico 2) ---');
    let sumPorcentajes = 0;
    dashRes.data.gastos_por_categoria.forEach((gc) => {
        sumPorcentajes += gc.porcentaje;
        assert(gc.total > 0, `Categoría "${gc.categoria}": Total $${gc.total} (${gc.porcentaje}%) Color: ${gc.color}`);
    });
    if (dashRes.data.gastos_por_categoria.length > 0) {
        assert(sumPorcentajes >= 98 && sumPorcentajes <= 102, `Suma de porcentajes de categorías es ~100% (${sumPorcentajes.toFixed(1)}%)`);
    }

    // ── 5. Verificación de Límites y Metas ───────────────
    console.log('\n--- PRUEBA 5: Límites y Metas de Ahorro ---');
    dashRes.data.limites.forEach((lim) => {
        assert(
            lim.disponible === Number((lim.monto_limite - lim.gastado).toFixed(2)),
            `Límite "${lim.categoria_nombre}": Límite $${lim.monto_limite}, Gastado $${lim.gastado}, Disponible $${lim.disponible} [${lim.badge_texto}]`
        );
    });

    dashRes.data.metas.forEach((m) => {
        assert(
            m.faltante === Math.max(0, Number((m.monto_meta - m.saldo).toFixed(2))),
            `Meta "${m.nombre}": $${m.saldo} / $${m.monto_meta} (${m.porcentaje}%) - Estado: ${m.estado}`
        );
    });

    // ── 6. Verificación de Cambio de Periodo ──────────────
    console.log('\n--- PRUEBA 6: Cambio de Periodo (Mes sin datos) ---');
    const emptyPeriodRes = await request('/dashboard?mes=2020-01-01');
    assert(emptyPeriodRes.status === 200, 'Mes 2020-01 respondió con código 200 sin errores');
    assert(emptyPeriodRes.data.resumen.total_ingresos === 0, 'Total ingresos es $0.00 en mes vacío');
    assert(emptyPeriodRes.data.resumen.total_egresos === 0, 'Total egresos es $0.00 en mes vacío');
    assert(emptyPeriodRes.data.resumen.balance === 0, 'Balance es $0.00 en mes vacío');
    assert(emptyPeriodRes.data.gastos_por_categoria.length === 0, 'Gastos por categoría está vacío sin romper la respuesta');

    console.log('\n======================================================');
    console.log('🎉 TODAS LAS PRUEBAS DEL DASHBOARD PASARON AL 100%');
    console.log('======================================================\n');
}

runTests().catch((err) => {
    console.error('Error fatal durante la prueba del dashboard:', err);
    process.exit(1);
});
