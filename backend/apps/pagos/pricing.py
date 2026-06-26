from decimal import Decimal

from dateutil.relativedelta import relativedelta


PRECIO_CLASE_BASE = Decimal('15000.00')
CLASES_INCLUIDAS_ABONO = 4
DESCUENTO_ABONADO = Decimal('0.20')
MULTIPLICADOR_ABONADO = Decimal('0.80')


def calcular_monto_cuota(precio_clase=PRECIO_CLASE_BASE):
    return (precio_clase * CLASES_INCLUIDAS_ABONO * MULTIPLICADOR_ABONADO).quantize(Decimal('0.01'))


def cliente_tiene_abono_vigente(cliente, fecha_clase):
    if not cliente.es_abonado or not fecha_clase:
        return False

    from apps.pagos.models import PagoCuota

    return PagoCuota.objects.filter(
        cliente=cliente,
        periodo=periodo_abono_para(fecha_clase),
        estado='aprobado',
    ).exists()


def periodo_abono_para(fecha_clase):
    return fecha_clase.replace(day=1)


def contar_clases_abonadas_en_periodo(cliente, fecha_clase, reserva_actual=None):
    from apps.reservas.models import Reserva

    inicio = periodo_abono_para(fecha_clase)
    fin = inicio + relativedelta(months=1)

    reservas = Reserva.objects.filter(
        paciente=cliente,
        estado='CONFIRMADA',
        clase__fecha_clase__gte=inicio,
        clase__fecha_clase__lt=fin,
    )

    if reserva_actual and reserva_actual.pk:
        reservas = reservas.exclude(pk=reserva_actual.pk)

    return reservas.count()


def calcular_monto_total_reserva(reserva):
    precio = Decimal(reserva.clase.precio)
    cliente = reserva.paciente
    fecha_clase = reserva.clase.fecha_clase

    if not cliente_tiene_abono_vigente(cliente, fecha_clase):
        return precio.quantize(Decimal('0.01'))

    clases_usadas = contar_clases_abonadas_en_periodo(cliente, fecha_clase, reserva)
    if clases_usadas < CLASES_INCLUIDAS_ABONO:
        return Decimal('0.00')

    return (precio * MULTIPLICADOR_ABONADO).quantize(Decimal('0.01'))
