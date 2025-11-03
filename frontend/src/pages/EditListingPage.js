import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import api from "../utils/api";
import toast from "react-hot-toast";

const amenityOptions = [
  "WiFi",
  "Kitchen",
  "Parking",
  "Air Conditioning",
  "Pool",
  "Gym",
  "Balcony",
  "Laundry",
  "Desk",
  "Pet Friendly",
  "Security",
  "Elevator",
  "Garden",
  "Rooftop",
  "Concierge",
];

const EditListingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: listing, isLoading } = useQuery(["listing", id], async () => {
    const res = await api.get(`/api/listings/${id}`);
    return res.data.data;
  });

  const [formData, setFormData] = useState({
    title: "",
    location: "",
    price: "",
    bedrooms: "",
    bathrooms: "",
    description: "",
    amenities: [],
  });
  const [images, setImages] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [phone, setPhone] = useState("");

  // Prefill form with existing data
  useEffect(() => {
    if (listing) {
      setFormData({
        title: listing.title || "",
        location: listing.location || "",
        price: listing.price || "",
        bedrooms: listing.bedrooms || "",
        bathrooms: listing.bathrooms || "",
        description: listing.description || "",
        amenities: listing.amenities || [],
      });
      setPhone(listing.user?.phone || "");

      if (listing.images && listing.images.length > 0) {
        setPreviewUrls(listing.images.map((img) => img.url || img));
      }
    }
  }, [listing]);

  // Handle text/number input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle amenities toggle
  const toggleAmenity = (amenity) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  // Handle image uploads
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  // Remove selected image preview
  const handleRemoveImage = (index) => {
    const updatedPreviews = previewUrls.filter((_, i) => i !== index);
    const updatedFiles = images.filter((_, i) => i !== index);
    setPreviewUrls(updatedPreviews);
    setImages(updatedFiles);
  };

  // Mutation for updating listing
  const updateMutation = useMutation(
    async (data) => {
      const formDataObj = new FormData();
      Object.keys(data).forEach((key) => {
        if (key === "amenities") {
          data[key].forEach((amenity) => formDataObj.append("amenities", amenity));
        } else {
          formDataObj.append(key, data[key]);
        }
      });

      images.forEach((file) => formDataObj.append("images", file));

      const res = await api.put(`/api/listings/${id}`, formDataObj, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success("Listing updated successfully!");
        queryClient.invalidateQueries(["listing", id]);
        navigate(`/listings/${id}`);
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || "Failed to update listing");
      },
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500">Loading listing details...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
        <h1 className="text-3xl font-semibold text-slate-800 mb-8 text-center">
          Edit Your Listing
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Property Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter property title"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Conact Number */}
          <div>
           <label className="block text-sm font-medium text-slate-700 mb-2">
            Contact 
            </label>
           <input
           type="text"
            name="phone"
            value={formData.phone || ""}
            onChange={handleChange}
           placeholder="Enter contact number"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
           />

           </div>


          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Enter property location"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Price (₱)
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="Enter price per night"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Bedrooms & Bathrooms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Bedrooms
              </label>
              <input
                type="number"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleChange}
                placeholder="No. of bedrooms"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Bathrooms
              </label>
              <input
                type="number"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleChange}
                placeholder="No. of bathrooms"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Write a short description about the property..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none h-32"
            />
          </div>

          {/* Amenities */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Amenities
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {amenityOptions.map((amenity) => (
                <button
                  type="button"
                  key={amenity}
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-3 py-2 rounded-lg border text-sm transition ${
                    formData.amenities.includes(amenity)
                      ? "bg-emerald-100 border-emerald-500 text-emerald-700"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {amenity}
                </button>
              ))}
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Upload Images
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-slate-600 border border-gray-300 rounded-lg p-2 cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {previewUrls.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {previewUrls.map((url, index) => (
                  <div
                    key={index}
                    className="relative rounded-lg overflow-hidden group"
                  >
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="h-32 w-full object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 bg-gray-100 text-slate-700 rounded-lg hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isLoading}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-70"
            >
              {updateMutation.isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditListingPage;
