// Email templates for BroLab Entertainment

export const emailTemplates = {
  verifyEmail: (verificationLink: string, username: string) => ({
    subject: "Vérifiez votre adresse email - BroLab Entertainment",
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">BroLab Entertainment</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Salut ${username} ! 👋</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              Bienvenue sur BroLab Entertainment ! Pour terminer votre inscription et accéder à votre compte, veuillez vérifier votre adresse email.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="background: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Vérifier mon email
              </a>
            </div>
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              Ce lien expirera dans 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.
            </p>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2025 BroLab Entertainment - Votre destination pour les beats de qualité
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  resetPassword: (resetLink: string, username: string) => ({
    subject: "Réinitialisation de votre mot de passe - BroLab Entertainment",
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">BroLab Entertainment</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Réinitialisation du mot de passe</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              Salut ${username}, vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: #EF4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Réinitialiser mon mot de passe
              </a>
            </div>
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              Ce lien expirera dans 15 minutes. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
            </p>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2025 BroLab Entertainment - Sécurité de votre compte
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  orderConfirmation: (orderDetails: {
    orderNumber: string;
    customerName: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    downloadLink?: string;
  }) => ({
    subject: `Commande confirmée #${orderDetails.orderNumber} - BroLab Entertainment`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">BroLab Entertainment</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Commande confirmée ! 🎉</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              Merci ${orderDetails.customerName} pour votre achat ! Votre commande a été traitée avec succès.
            </p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Numéro de commande :</strong> ${orderDetails.orderNumber}</p>
              <p style="margin: 10px 0 0 0;"><strong>Total :</strong> ${orderDetails.total}€</p>
            </div>
            <p style="color: #666; line-height: 1.6;">
              Vos fichiers sont maintenant disponibles dans votre compte. Connectez-vous pour les télécharger.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://brolabentertainment.com/dashboard" style="background: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Accéder à mes téléchargements
              </a>
            </div>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2025 BroLab Entertainment - Merci pour votre confiance
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  subscriptionConfirmation: (subscriptionDetails: {
    planName: string;
    customerName: string;
    billingCycle: string;
    nextBillingDate: string;
    features: string[];
  }) => ({
    subject: `Abonnement activé - ${subscriptionDetails.planName} - BroLab Entertainment`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">BroLab Entertainment</h1>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Abonnement activé ! ⭐</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              Félicitations ${subscriptionDetails.customerName} ! Votre abonnement ${subscriptionDetails.planName} est maintenant actif.
            </p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Plan :</strong> ${subscriptionDetails.planName}</p>
              <p style="margin: 10px 0 0 0;"><strong>Cycle :</strong> ${subscriptionDetails.billingCycle}</p>
              <p style="margin: 10px 0 0 0;"><strong>Prochaine facture :</strong> ${subscriptionDetails.nextBillingDate}</p>
            </div>
            <p style="color: #666; line-height: 1.6;">
              Profitez de tous les avantages de votre abonnement dès maintenant !
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://brolabentertainment.com/membership" style="background: #F59E0B; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Gérer mon abonnement
              </a>
            </div>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2025 BroLab Entertainment - Votre partenaire musical
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};

export default emailTemplates;
