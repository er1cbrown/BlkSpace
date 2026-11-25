import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { DeckMapApp } from "@/components/cyberdeck/DeckMapApp";
import { MAP_DRAFT_KEY } from "@/lib/deck-map";
import { PLACES_KEY } from "@/lib/deck-query";

const routeBody = {
  code: "Ok",
  routes: [
    {
      distance: 1200,
      duration: 180,
      geometry: {
        coordinates: [
          [-84.39, 33.75],
          [-84.38, 33.76],
        ],
      },
      legs: [
        {
          steps: [
            {
              distance: 1200,
              name: "Peachtree Street",
              maneuver: { type: "depart", modifier: "right" },
            },
          ],
        },
      ],
    },
  ],
};

describe("maps app", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("asks OSRM only after Get route and shows the turn", async () => {
    localStorage.setItem(
      MAP_DRAFT_KEY,
      JSON.stringify({
        osrmBase: "http://127.0.0.1:5000",
        tileTemplate: "",
        fromLat: "33.75",
        fromLon: "-84.39",
        toLat: "33.76",
        toLon: "-84.38",
      }),
    );
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => routeBody,
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <Router>
        <DeckMapApp />
      </Router>,
    );

    expect(screen.getByRole("heading", { name: "Maps" })).toBeTruthy();
    expect(screen.getByText("Car receiver not connected")).toBeTruthy();
    expect(screen.getByText("No route yet.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Get route" }));

    expect(await screen.findByText("Head right on Peachtree Street")).toBeTruthy();
    expect(screen.getByText("1.2 km · 3 min")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url.startsWith("http://127.0.0.1:5000/route/v1/driving/")).toBe(true);
    expect(url.includes("-84.390000,33.750000;-84.380000,33.760000")).toBe(true);
  });

  it("keeps the last route off the screen when OSRM does not answer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("down");
      }),
    );
    render(
      <Router>
        <DeckMapApp />
      </Router>,
    );
    fireEvent.change(screen.getByLabelText("Start latitude"), {
      target: { value: "33.75" },
    });
    fireEvent.change(screen.getByLabelText("Start longitude"), {
      target: { value: "-84.39" },
    });
    fireEvent.change(screen.getByLabelText("End latitude"), {
      target: { value: "33.76" },
    });
    fireEvent.change(screen.getByLabelText("End longitude"), {
      target: { value: "-84.38" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Get route" }));
    expect(
      await screen.findByText(/OSRM did not answer/i),
    ).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Turns" })).toBeNull();
  });

  it("uses a device fix as the start and says it is not the car receiver", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: 33.7,
          longitude: -84.4,
          accuracy: 1,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: 0,
        toJSON: () => ({}),
      });
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
    render(
      <Router>
        <DeckMapApp />
      </Router>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Use this device" }));
    await waitFor(() => {
      expect(
        (screen.getByLabelText("Start latitude") as HTMLInputElement).value,
      ).toBe("33.700000");
    });
    expect(
      (screen.getByLabelText("Start longitude") as HTMLInputElement).value,
    ).toBe("-84.400000");
    expect(
      screen.getByText("This fix is from this device, not the car receiver."),
    ).toBeTruthy();
  });

  it("turns gas then home into a route through local search", async () => {
    localStorage.setItem(
      MAP_DRAFT_KEY,
      JSON.stringify({
        osrmBase: "http://127.0.0.1:5000",
        geocoderBase: "http://127.0.0.1:8088",
        tileTemplate: "",
        fromLat: "33.75",
        fromLon: "-84.39",
        toLat: "",
        toLon: "",
      }),
    );
    localStorage.setItem(
      PLACES_KEY,
      JSON.stringify([{ name: "home", point: { lat: 33.8, lon: -84.3 } }]),
    );
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/search")) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { lat: "33.755", lon: "-84.385", display_name: "Shell, Atlanta" },
          ],
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => routeBody,
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <Router>
        <DeckMapApp />
      </Router>,
    );
    expect(screen.getByText("Home is saved.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Sentence"), {
      target: { value: "gas then home" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Route sentence" }));
    expect(await screen.findByText(/here → Shell → home/)).toBeTruthy();
    expect(
      (screen.getByLabelText("End latitude") as HTMLInputElement).value,
    ).toBe("33.800000");
    const routeUrl = String(fetchMock.mock.calls[1]?.[0]);
    expect(routeUrl).toContain(
      "-84.390000,33.750000;-84.385000,33.755000;-84.300000,33.800000",
    );
  });

  it("moves the start pin from the receiver and leaves the last route", async () => {
    localStorage.setItem(
      MAP_DRAFT_KEY,
      JSON.stringify({
        osrmBase: "http://127.0.0.1:5000",
        geocoderBase: "http://127.0.0.1:8088",
        receiverBase: "http://127.0.0.1:2948/fix",
        tileTemplate: "",
        fromLat: "33.75",
        fromLon: "-84.39",
        toLat: "33.76",
        toLon: "-84.38",
      }),
    );
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/fix")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ class: "TPV", mode: 3, lat: 33.751, lon: -84.391 }),
        };
      }
      return { ok: true, status: 200, json: async () => routeBody };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <Router>
        <DeckMapApp />
      </Router>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Get route" }));
    expect(await screen.findByText("Head right on Peachtree Street")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Follow the receiver" }));
    await waitFor(() => {
      expect(
        (screen.getByLabelText("Start latitude") as HTMLInputElement).value,
      ).toBe("33.751000");
    });
    expect(
      (screen.getByLabelText("Start longitude") as HTMLInputElement).value,
    ).toBe("-84.391000");
    expect(screen.getByText("This fix is from the receiver.")).toBeTruthy();
    expect(screen.getByText("Receiver fix")).toBeTruthy();
    expect(screen.getByText("Head right on Peachtree Street")).toBeTruthy();
    expect(screen.getByText("1.2 km · 3 min")).toBeTruthy();
  });
});
