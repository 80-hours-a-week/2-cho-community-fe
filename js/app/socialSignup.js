// js/app/socialSignup.js
import SocialSignupController from '../controllers/SocialSignupController.js';
import { setAccessToken } from '../services/ApiService.js';

// URL에서 access_token 추출 및 저장
const params = new URLSearchParams(window.location.search);
const token = params.get('access_token');
if (token) {
    setAccessToken(token);
    // URL에서 토큰 제거 (보안)
    window.history.replaceState({}, '', '/social-signup');
}

const controller = new SocialSignupController();
controller.init();
