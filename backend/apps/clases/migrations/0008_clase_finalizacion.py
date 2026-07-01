from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clases', '0007_clase_qr_token'),
    ]

    operations = [
        migrations.AddField(
            model_name='clase',
            name='finalizada',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='clase',
            name='fecha_finalizacion',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
