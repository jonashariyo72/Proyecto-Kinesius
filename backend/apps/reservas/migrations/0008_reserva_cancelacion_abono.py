from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reservas', '0007_alter_reserva_estado'),
    ]

    operations = [
        migrations.AddField(
            model_name='reserva',
            name='cubierta_por_abono',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='reserva',
            name='cancelacion_tardia',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='reserva',
            name='fecha_cancelacion',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
