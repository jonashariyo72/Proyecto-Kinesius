from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pagos', '0004_pagocuota'),
    ]

    operations = [
        migrations.CreateModel(
            name='ConfiguracionCuota',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('dia_inicio_pago', models.PositiveSmallIntegerField(default=1)),
                ('dia_fin_pago', models.PositiveSmallIntegerField(default=18)),
                ('actualizado_en', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Configuracion de Cuota',
            },
        ),
    ]
