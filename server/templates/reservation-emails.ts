export const reservationConfirmationTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .details { background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Confirmation de Réservation</h2>
    </div>
    
    <p>Bonjour {{username}},</p>
    
    <p>Nous avons bien reçu votre réservation pour une session {{serviceType}}. Voici les détails :</p>
    
    <div class="details">
      <p><strong>Date :</strong> {{date}}</p>
      <p><strong>Heure :</strong> {{time}}</p>
      <p><strong>Durée :</strong> {{duration}} minutes</p>
      <p><strong>Prix :</strong> {{price}}€</p>
      <p><strong>Numéro de réservation :</strong> {{reservationId}}</p>
    </div>
    
    <p>Nous vous contacterons prochainement pour confirmer votre créneau et discuter des détails de votre session.</p>
    
    <p>Si vous avez des questions ou besoin de modifier votre réservation, n'hésitez pas à nous contacter.</p>
    
    <div class="footer">
      <p>Merci de votre confiance !</p>
      <p>L'équipe BroLab</p>
    </div>
  </div>
</body>
</html>
`;

export const reservationStatusUpdateTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .status { font-weight: bold; color: #2c5282; }
    .details { background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Mise à jour de votre Réservation</h2>
    </div>
    
    <p>Bonjour {{username}},</p>
    
    <p>Le statut de votre réservation pour la session {{serviceType}} a été mis à jour.</p>
    
    <div class="details">
      <p><strong>Nouveau statut :</strong> <span class="status">{{status}}</span></p>
      <p><strong>Date :</strong> {{date}}</p>
      <p><strong>Heure :</strong> {{time}}</p>
    </div>
    
    {{#if status === 'confirmed'}}
    <p>Votre créneau est maintenant confirmé. Nous avons hâte de travailler avec vous !</p>
    {{/if}}
    
    {{#if status === 'cancelled'}}
    <p>Votre réservation a été annulée. Si vous souhaitez réserver un nouveau créneau, n'hésitez pas à nous contacter.</p>
    {{/if}}
    
    <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
    
    <div class="footer">
      <p>Merci de votre confiance !</p>
      <p>L'équipe BroLab</p>
    </div>
  </div>
</body>
</html>
`;