import { StandardHero } from "@/components/ui/StandardHero";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Heart, Music, Star, Target, Users } from "lucide-react";

export default function About() {
  const stats = [
    { icon: Music, label: "Beats Created", value: "2,000+" },
    { icon: Users, label: "Artists Served", value: "50+" },
    { icon: Award, label: "Years of Experience", value: "5+" },
    { icon: Star, label: "Premium Quality", value: "100%" },
  ];

  const values = [
    {
      icon: Heart,
      title: "Passion for Music",
      description:
        "Every beat we create comes from a deep love and respect for the art of music production.",
    },
    {
      icon: Target,
      title: "Artist-Focused",
      description:
        "We understand what artists need and craft beats that inspire creativity and elevate careers.",
    },
    {
      icon: Award,
      title: "Premium Quality",
      description:
        "We never compromise on quality. Every beat is professionally mixed and mastered to industry standards.",
    },
    {
      icon: Users,
      title: "Community Driven",
      description:
        "We believe in building a community where artists can thrive and create their best work.",
    },
  ];

  const team = [
    {
      name: "Treigua",
      role: "Founder & Lead Producer",
      image: "/api/placeholder/200/200",
      bio: "With over 5 years of experience in music production, Treigua founded BroLab Entertainment to help artists access premium quality beats.",
    },
    {
      name: "Marcus Johnson",
      role: "Sound Engineer",
      image: "/api/placeholder/200/200",
      bio: "Marcus brings technical expertise and an ear for detail, ensuring every beat meets our high-quality standards.",
    },
    {
      name: "Sarah Chen",
      role: "Music Director",
      image: "/api/placeholder/200/200",
      bio: "Sarah curates our beat catalog and works with artists to understand current trends and demands in the industry.",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--deep-black)]">
      <StandardHero
        title="About Us"
        subtitle="We are a premier music production company dedicated to creating high-quality beats that inspire artists and elevate the music industry. Founded with a passion for innovation and excellence, we've been helping artists bring their creative visions to life."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map(stat => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className="bg-[var(--medium-gray)] border-[var(--medium-gray)] text-center"
              >
                <CardContent className="p-6">
                  <Icon className="w-12 h-12 text-[var(--accent-purple)] mx-auto mb-4" />
                  <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-gray-400">{stat.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Our Story */}
        <div className="mb-16">
          <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">Our Story</h2>
              <div className="prose prose-lg prose-invert max-w-none">
                <p className="text-gray-300 leading-relaxed mb-6 text-center">
                  Founded in 2019, BroLab Entertainment started as a passion project between friends
                  who shared a love for creating innovative beats. What began in a small home studio
                  has grown into a professional production house serving artists worldwide.
                </p>
                <p className="text-gray-300 leading-relaxed mb-6 text-center">
                  Our journey has been driven by one simple belief: every artist deserves access to
                  high-quality production that elevates their music. We&apos;ve worked with emerging
                  talents and established artists, always maintaining our commitment to excellence
                  and creative collaboration.
                </p>
                <p className="text-gray-300 leading-relaxed text-center">
                  Today, we continue to push boundaries, explore new sounds, and support the next
                  generation of musical innovators. Your success is our success, and we&apos;re here
                  to help you achieve your dreams.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Our Values */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-8">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map(value => {
              const Icon = value.icon;
              return (
                <Card
                  key={value.title}
                  className="bg-[var(--medium-gray)] border-[var(--medium-gray)]"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <Icon className="w-8 h-8 text-[var(--accent-purple)]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">{value.title}</h3>
                        <p className="text-gray-300 leading-relaxed">{value.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-8">Meet Our Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map(member => (
              <Card
                key={member.name}
                className="bg-[var(--medium-gray)] border-[var(--medium-gray)]"
              >
                <CardContent className="p-6 text-center">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-blue-600">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                  <Badge className="bg-[var(--accent-purple)] mb-4">{member.role}</Badge>
                  <p className="text-gray-300 text-sm leading-relaxed">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Mission Statement */}
        <div className="text-center">
          <Card className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-[var(--accent-purple)]">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-white mb-4">Our Mission</h2>
              <p className="text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
                To empower artists worldwide by providing access to premium-quality beats that
                inspire creativity, drive innovation, and help turn musical dreams into reality. We
                believe that great music starts with great beats, and we&apos;re here to provide
                exactly that.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
