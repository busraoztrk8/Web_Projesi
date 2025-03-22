from flask import Blueprint, send_from_directory

bp = Blueprint('api', __name__, url_prefix='/api')

@bp.route('/')
def serve_index():
    return send_from_directory('public', 'index.html')

# Başka HİÇBİR ŞEY olmasın! (register, login, entries, hello_world, vb. YOK)