from django.db import migrations, models


def fijar_inicio_en_uno(apps, schema_editor):
    ConfiguracionCuota = apps.get_model('pagos', 'ConfiguracionCuota')
    ConfiguracionCuota.objects.update(dia_inicio_pago=1)


class Migration(migrations.Migration):

    dependencies = [
        ('pagos', '0005_configuracioncuota'),
    ]

    operations = [
        migrations.AlterField(
            model_name='configuracioncuota',
            name='dia_inicio_pago',
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.RunPython(fijar_inicio_en_uno, migrations.RunPython.noop),
    ]
