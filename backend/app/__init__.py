from flask import Flask
from flask_cors import CORS
from . import views, models
from .utils import db
from .config import DevelopmentConfig

def create_app(config_name="development"):
    app = Flask(__name__, static_folder='frontend/public')  # Statik dosya yolunu belirt
    CORS(app)

    app.config.from_object(DevelopmentConfig)

    db.init_app(app)
    app.register_blueprint(views.bp)

    @app.before_request
    def before_first_request_func():
        if not app._got_first_request:
            with app.app_context():
                db.create_all()
            app._got_first_request = True

    return app