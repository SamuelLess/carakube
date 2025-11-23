import { NextResponse } from "next/server";

// Use Docker service name when in container, localhost when running locally
const EXTERNAL_API_URL = process.env.API_URL?.replace("/api/graph", "/api/autofix/fix/") || "http://operator:8000/api/autofix/fix/";

export const POST = async () => {
  try {
    const response = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // If the external API call was not successful, return a JSON error response
      return NextResponse.json(
        { status: "error", message: response.statusText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error calling autofix API:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to connect to backend service" },
      { status: 500 }
    );
  }
};
