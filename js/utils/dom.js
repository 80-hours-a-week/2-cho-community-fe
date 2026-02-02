// js/utils/dom.js
// DOM 조작 헬퍼 함수 모듈

/**
 * DOM 요소를 생성하는 헬퍼 함수
 * @param {string} tag - 태그 이름 (예: 'div', 'span')
 * @param {object} [attributes={}] - 속성 객체 (예: { class: 'btn', id: 'submit' })
 * @param {Array<string|Node>} [children=[]] - 자식 요소 배열 (문자열 또는 DOM 노드)
 * @returns {HTMLElement} - 생성된 DOM 요소
 */
export function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);

    // 속성 설정
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else if (key.startsWith('on') && typeof value === 'function') {
            // 이벤트 리스너 (예: onClick)
            const eventName = key.substring(2).toLowerCase();
            element.addEventListener(eventName, value);
        } else {
            element.setAttribute(key, value);
        }
    });

    // 자식 요소 추가
    children.forEach(child => {
        if (child instanceof Node) {
            element.appendChild(child);
        } else if (child !== null && child !== undefined && child !== false) {
            // 문자열이나 숫자는 텍스트 노드로 추가 (XSS 방지)
            element.appendChild(document.createTextNode(String(child)));
        }
    });

    return element;
}

/**
 * 요소를 비우는 헬퍼 함수
 * @param {HTMLElement} element - 비울 요소
 */
export function clearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}
