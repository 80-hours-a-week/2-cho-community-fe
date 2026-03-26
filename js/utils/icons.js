// @ts-check
// js/utils/icons.js
// lucide 패키지 기반 SVG 아이콘 팩토리
// 기존 API 호환: Icons.bell(size) → SVGSVGElement

import {
    createElement,
    Sun, Moon, Bell, BellRing, BellOff, LayoutGrid, BookOpen, Package, ChevronLeft,
    Bold, Italic, Strikethrough, Heading, Link, Image, Code,
    SquareCode, TextQuote, List, ListOrdered, Minus, Eye, Mail, EyeOff,
    // 배지 아이콘
    Edit, MessageSquare, Heart, UserCheck, Bookmark, ThumbsUp, FileText, Star,
    MessageCircle, Edit3, CheckCircle, Award, TrendingUp, Users, Calendar,
    Zap, Shield, Globe, Book, Sunrise, Flag, Crown,
} from 'lucide';

/**
 * 아이콘 정의: [lucide 아이콘 노드, 기본 크기(px)]
 * @type {Record<string, [import('lucide').IconNode, number]>}
 */
const ICON_DEFS = {
    sun:           [Sun, 20],
    moon:          [Moon, 20],
    bell:          [Bell, 20],
    bellRing:      [BellRing, 20],
    bellOff:       [BellOff, 20],
    layoutGrid:    [LayoutGrid, 20],
    bookOpen:      [BookOpen, 20],
    package:       [Package, 20],
    chevronLeft:   [ChevronLeft, 24],
    bold:          [Bold, 16],
    italic:        [Italic, 16],
    strikethrough: [Strikethrough, 16],
    heading:       [Heading, 16],
    link:          [Link, 16],
    image:         [Image, 16],
    code:          [Code, 16],
    codeBlock:     [SquareCode, 16],
    quote:         [TextQuote, 16],
    listUl:        [List, 16],
    listOl:        [ListOrdered, 16],
    minus:         [Minus, 16],
    eye:           [Eye, 16],
    mail:          [Mail, 20],
    eyeOff:        [EyeOff, 16],
    // 배지 아이콘 (badge_definition.icon 값과 매칭)
    edit:          [Edit, 20],
    comment:       [MessageSquare, 20],
    heart:         [Heart, 20],
    'user-check':  [UserCheck, 20],
    bookmark:      [Bookmark, 20],
    'thumbs-up':   [ThumbsUp, 20],
    'file-text':   [FileText, 20],
    star:          [Star, 20],
    'message-circle': [MessageCircle, 20],
    'edit-3':      [Edit3, 20],
    'check-circle': [CheckCircle, 20],
    award:         [Award, 20],
    'trending-up': [TrendingUp, 20],
    'book-open':   [BookOpen, 20],
    users:         [Users, 20],
    calendar:      [Calendar, 20],
    zap:           [Zap, 20],
    shield:        [Shield, 20],
    globe:         [Globe, 20],
    book:          [Book, 20],
    sunrise:       [Sunrise, 20],
    flag:          [Flag, 20],
    crown:         [Crown, 20],
};

/**
 * SVG 아이콘 모음 — ICON_DEFS로부터 팩토리 함수 자동 생성
 * 모든 아이콘은 stroke 기반, currentColor 사용 (lucide 기본값)
 * @type {Record<string, (size?: number) => SVGSVGElement>}
 */
export const Icons = Object.fromEntries(
    Object.entries(ICON_DEFS).map(([name, [node, defaultSize]]) => [
        name,
        (size = defaultSize) => /** @type {SVGSVGElement} */ (
            createElement(node, { width: size, height: size })
        ),
    ])
);
