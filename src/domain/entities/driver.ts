export interface Driver {
  partnerId: string;
  fullName: string;
  mobileNumber: string;
  dateOfBirth: string;
  address: string;
  email: string;
  vehicleType: string;
  registrationNumber: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  status: boolean;
  
  // Document paths (legacy format - maintained for backward compatibility)
  aadharPath?: string;
  panPath?: string;
  licensePath?: string;
  insuranceDocPath?: string;
  pollutionDocPath?: string;
  profilePicturePath?: string;

  // Document URLs with front and back sides
  vehicleDocuments?: {
    aadhar?: { frontUrl?: string; backUrl?: string };
    pan?: { frontUrl?: string; backUrl?: string };
    license?: { frontUrl?: string; backUrl?: string };
    insurance?: { frontUrl?: string; backUrl?: string };
    pollution?: { frontUrl?: string; backUrl?: string };
    registration?: { frontUrl?: string; backUrl?: string };
    permit?: { frontUrl?: string; backUrl?: string };
  };

  // Status flags
  isActive: boolean;
  isVerified: boolean;
  bankDetailsCompleted: boolean;
  personalDocumentsCompleted: boolean;
  vehicleDetailsCompleted: boolean;

  // Order statistics
  totalOrders: number;
  ongoingOrders: number;
  completedOrders: number;
  canceledOrders: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Factory function to create a new Driver
export const createDriver = (data: {
  partnerId: string;
  fullName: string;
  mobileNumber: string;
  dateOfBirth: string;
  address: string;
  email: string;
  vehicleType: string;
  registrationNumber: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  aadharPath?: string;
  panPath?: string;
  licensePath?: string;
  insuranceDocPath?: string;
  pollutionDocPath?: string;
  profilePicturePath?: string;
  vehicleDocuments?: {
    aadhar?: { frontUrl?: string; backUrl?: string };
    pan?: { frontUrl?: string; backUrl?: string };
    license?: { frontUrl?: string; backUrl?: string };
    insurance?: { frontUrl?: string; backUrl?: string };
    pollution?: { frontUrl?: string; backUrl?: string };
    registration?: { frontUrl?: string; backUrl?: string };
    permit?: { frontUrl?: string; backUrl?: string };
  };
}): Driver => {
  return {
    status: true,
    ...data,
    isActive: true,
    isVerified: false,
    bankDetailsCompleted: false,
    personalDocumentsCompleted: false,
    vehicleDetailsCompleted: false,
    totalOrders: 0,
    ongoingOrders: 0,
    completedOrders: 0,
    canceledOrders: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};