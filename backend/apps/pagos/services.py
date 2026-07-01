from dateutil.relativedelta import relativedelta


def aprobar_pago_cuota(pago_cuota, id_transaccion=None):
    

    if pago_cuota.estado == "aprobado":
        print("Ya estaba aprobado")
        return pago_cuota

    pago_cuota.estado = "aprobado"

    if id_transaccion:
        pago_cuota.id_transaccion_externa = str(id_transaccion)

    pago_cuota.save()

    cliente = pago_cuota.cliente

    print("ANTES")
    print(cliente.id)
    print(cliente.es_abonado)
    print(cliente.fecha_venc_cuota)

    cliente.es_abonado = True
    cliente.fecha_venc_cuota = pago_cuota.periodo + relativedelta(months=1)
    cliente.save()
    print(f"DESPUÉS: es_abonado={cliente.es_abonado}, fecha_venc={cliente.fecha_venc_cuota}")




    cliente.refresh_from_db()
    
  

    return pago_cuota