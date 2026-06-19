import uuid
from django.db import migrations, models


def generar_uuids(apps, schema_editor):
    Clase = apps.get_model('clases', 'Clase')
    for clase in Clase.objects.all():
        clase.qr_token = uuid.uuid4()
        clase.save(update_fields=['qr_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('clases', '0006_alter_clase_unique_together'),
    ]

    operations = [
        migrations.AddField(
            model_name='clase',
            name='qr_token',
            field=models.UUIDField(null=True, blank=True),
        ),
        migrations.RunPython(generar_uuids),
        migrations.AlterField(
            model_name='clase',
            name='qr_token',
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False),
        ),
    ]