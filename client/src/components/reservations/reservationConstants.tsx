import { CheckCircle, CreditCard, FileText, Send } from "lucide-react";

/**
 * Default reservation form submission steps
 */
export const defaultReservationSteps = [
  {
    title: "Validating Information",
    description: "Checking form data and user authentication",
    icon: <FileText className="w-5 h-5" />,
  },
  {
    title: "Creating Reservation",
    description: "Setting up your service booking",
    icon: <Send className="w-5 h-5" />,
  },
  {
    title: "Preparing Payment",
    description: "Setting up secure payment processing",
    icon: <CreditCard className="w-5 h-5" />,
  },
  {
    title: "Finalizing",
    description: "Completing your reservation",
    icon: <CheckCircle className="w-5 h-5" />,
  },
] as const;
