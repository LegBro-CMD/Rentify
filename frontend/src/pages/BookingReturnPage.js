import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../utils/api";
import toast from "react-hot-toast";

const BookingReturnPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const propertyId = params.get("propertyId");

    if (!propertyId) {
      toast.error("Missing property details.");
      navigate("/");
      return;
    }

    const confirmBooking = async () => {
      try {
        const response = await api.post("/api/bookings/manual", {
          listingId: propertyId,
        });

        if (response.data.success) {
          toast.success("Booking confirmed successfully!");
          navigate("/my-bookings");
        } else {
          toast.error("Booking failed. Try again.");
          navigate("/");
        }
      } catch (error) {
        console.error("Booking confirmation error:", error);
        toast.error("Error confirming booking.");
        navigate("/");
      }
    };

    confirmBooking();
  }, [location, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-xl font-semibold text-gray-800">
        Processing your booking...
      </h2>
      <p className="text-gray-500 mt-2">Please wait a moment.</p>
    </div>
  );
};

export default BookingReturnPage;
