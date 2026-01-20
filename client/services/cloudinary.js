export async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_PRESET);
  
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD}/image/upload`,
      {
        method: "POST",
        body: formData
      }
    );
  
    const data = await res.json();
    return data.secure_url;
  }
  