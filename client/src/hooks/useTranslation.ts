import { useState, useEffect } from 'react';
import { useGeolocation } from './useGeolocation';

interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

const translations: Translations = {
  en: {
    'nav.home': 'Home',
    'nav.beats': 'Beats',
    'nav.membership': 'Membership',
    'nav.services': 'Services',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.dashboard': 'Dashboard',
    'nav.login': 'Login',
    'cart.title': 'Shopping Cart',
    'cart.empty': 'Your cart is empty',
    'cart.total': 'Total',
    'cart.checkout': 'Proceed to Checkout',
    'cart.continue': 'Continue Shopping',
    'product.preview': 'Preview',
    'product.addToCart': 'Add to Cart',
    'product.license': 'License',
    'license.basic': 'Basic License',
    'license.premium': 'Premium License',
    'license.unlimited': 'Unlimited License',
    'checkout.title': 'Checkout',
    'checkout.payment': 'Payment Method',
    'checkout.complete': 'Complete Purchase',
    'currency.usd': 'USD',
    'currency.eur': 'EUR',
    'currency.gbp': 'GBP',
    'currency.jpy': 'JPY',
  },
  es: {
    'nav.home': 'Inicio',
    'nav.beats': 'Beats',
    'nav.membership': 'Membresía',
    'nav.services': 'Servicios',
    'nav.about': 'Acerca de',
    'nav.contact': 'Contacto',
    'nav.dashboard': 'Panel',
    'nav.login': 'Iniciar Sesión',
    'cart.title': 'Carrito de Compras',
    'cart.empty': 'Tu carrito está vacío',
    'cart.total': 'Total',
    'cart.checkout': 'Proceder al Pago',
    'cart.continue': 'Seguir Comprando',
    'product.preview': 'Vista Previa',
    'product.addToCart': 'Añadir al Carrito',
    'product.license': 'Licencia',
    'license.basic': 'Licencia Básica',
    'license.premium': 'Licencia Premium',
    'license.unlimited': 'Licencia Ilimitada',
    'checkout.title': 'Pago',
    'checkout.payment': 'Método de Pago',
    'checkout.complete': 'Completar Compra',
  },
  fr: {
    'nav.home': 'Accueil',
    'nav.beats': 'Beats',
    'nav.membership': 'Adhésion',
    'nav.services': 'Services',
    'nav.about': 'À Propos',
    'nav.contact': 'Contact',
    'nav.dashboard': 'Tableau de Bord',
    'nav.login': 'Connexion',
    'cart.title': 'Panier',
    'cart.empty': 'Votre panier est vide',
    'cart.total': 'Total',
    'cart.checkout': 'Procéder au Paiement',
    'cart.continue': 'Continuer les Achats',
    'product.preview': 'Aperçu',
    'product.addToCart': 'Ajouter au Panier',
    'product.license': 'Licence',
    'license.basic': 'Licence de Base',
    'license.premium': 'Licence Premium',
    'license.unlimited': 'Licence Illimitée',
    'checkout.title': 'Paiement',
    'checkout.payment': 'Méthode de Paiement',
    'checkout.complete': 'Finaliser l\'Achat',
  },
  de: {
    'nav.home': 'Startseite',
    'nav.beats': 'Beats',
    'nav.membership': 'Mitgliedschaft',
    'nav.services': 'Dienstleistungen',
    'nav.about': 'Über Uns',
    'nav.contact': 'Kontakt',
    'nav.dashboard': 'Dashboard',
    'nav.login': 'Anmelden',
    'cart.title': 'Warenkorb',
    'cart.empty': 'Ihr Warenkorb ist leer',
    'cart.total': 'Gesamt',
    'cart.checkout': 'Zur Kasse',
    'cart.continue': 'Weiter Einkaufen',
    'product.preview': 'Vorschau',
    'product.addToCart': 'In den Warenkorb',
    'product.license': 'Lizenz',
    'license.basic': 'Basis-Lizenz',
    'license.premium': 'Premium-Lizenz',
    'license.unlimited': 'Unbegrenzte Lizenz',
    'checkout.title': 'Kasse',
    'checkout.payment': 'Zahlungsmethode',
    'checkout.complete': 'Kauf Abschließen',
  },
  ja: {
    'nav.home': 'ホーム',
    'nav.beats': 'ビート',
    'nav.membership': 'メンバーシップ',
    'nav.services': 'サービス',
    'nav.about': '会社概要',
    'nav.contact': 'お問い合わせ',
    'nav.dashboard': 'ダッシュボード',
    'nav.login': 'ログイン',
    'cart.title': 'ショッピングカート',
    'cart.empty': 'カートは空です',
    'cart.total': '合計',
    'cart.checkout': 'チェックアウト',
    'cart.continue': '買い物を続ける',
    'product.preview': 'プレビュー',
    'product.addToCart': 'カートに追加',
    'product.license': 'ライセンス',
    'license.basic': 'ベーシックライセンス',
    'license.premium': 'プレミアムライセンス',
    'license.unlimited': '無制限ライセンス',
    'checkout.title': 'チェックアウト',
    'checkout.payment': '支払い方法',
    'checkout.complete': '購入完了',
  },
  zh: {
    'nav.home': '首页',
    'nav.beats': '节拍',
    'nav.membership': '会员',
    'nav.services': '服务',
    'nav.about': '关于我们',
    'nav.contact': '联系',
    'nav.dashboard': '仪表板',
    'nav.login': '登录',
    'cart.title': '购物车',
    'cart.empty': '您的购物车是空的',
    'cart.total': '总计',
    'cart.checkout': '结账',
    'cart.continue': '继续购物',
    'product.preview': '预览',
    'product.addToCart': '添加到购物车',
    'product.license': '许可证',
    'license.basic': '基础许可证',
    'license.premium': '高级许可证',
    'license.unlimited': '无限许可证',
    'checkout.title': '结账',
    'checkout.payment': '付款方式',
    'checkout.complete': '完成购买',
  }
};

export const useTranslation = () => {
  const { geolocation } = useGeolocation();
  const [currentLanguage, setCurrentLanguage] = useState('en');

  useEffect(() => {
    setCurrentLanguage(geolocation.language);
  }, [geolocation.language]);

  const t = (key: string): string => {
    return translations[currentLanguage]?.[key] || translations.en?.[key] || key;
  };

  const changeLanguage = (language: string) => {
    setCurrentLanguage(language);
  };

  return {
    t,
    currentLanguage,
    changeLanguage,
    availableLanguages: Object.keys(translations),
  };
};